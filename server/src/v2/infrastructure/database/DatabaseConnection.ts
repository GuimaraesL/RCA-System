/**
 * Proposta: Singleton de conexão e gerenciamento da base de dados SQLite (sql.js).
 * Fluxo: Resolve o caminho do arquivo físico, inicializa o motor WebAssembly e implementa uma estratégia de persistência debounced para otimizar a escrita em disco.
 */

import initSqlJs, { Database, QueryExecResult } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export class DatabaseConnection {
    private static instance: DatabaseConnection;
    private db: Database | null = null;
    private dbPath: string;

    private constructor() {
        // Resolução do caminho: server/data/rca.db (ou rca_test.db em modo de teste)
        const isTest = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
        const dbFileName = isTest ? 'rca_test.db' : 'rca.db';
        
        const DATA_DIR = join(__dirname, '..', '..', '..', '..', 'data');
        this.dbPath = this.resolveDbPath(DATA_DIR, dbFileName);
        console.log(`[V2] 💾 Base de dados resolvida (${isTest ? 'TESTE' : 'PRODUÇÃO'}): ${this.dbPath}`);
    }

    public static getInstance(): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    /**
     * Tenta localizar o diretório de dados em diferentes contextos de execução (CWD vs __dirname).
     */
    private resolveDbPath(dataDir: string, fileName: string): string {
        let path = join(dataDir, fileName);

        if (!existsSync(dirname(path))) {
            console.warn(`[V2] ⚠️ Diretório de dados não encontrado em ${dirname(path)}, tentando contexto de trabalho (CWD)...`);
            const cwd = process.cwd();
            if (cwd.endsWith('server')) {
                path = join(cwd, 'data', fileName);
            } else {
                path = join(cwd, 'server', 'data', fileName);
            }
        }
        return path;
    }

    /**
     * Inicializa o motor sql.js e carrega o arquivo físico se existir.
     */
    public async initialize(): Promise<void> {
        if (this.db) return;

        // Garante a existência do diretório de dados
        const dir = dirname(this.dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        const SQL = await initSqlJs();

        if (existsSync(this.dbPath)) {
            const buffer = readFileSync(this.dbPath);
            this.db = new SQL.Database(buffer);
        } else {
            this.db = new SQL.Database();
            // Nota: A inicialização do schema é orquestrada pelo MigrationRunner
        }

        // Ativa suporte a chaves estrangeiras (exige ativação explícita no SQLite)
        this.db.run('PRAGMA foreign_keys = ON');
    }

    public getRawDatabase(): Database {
        if (!this.db) {
            throw new Error('Base de dados não inicializada. Chame initialize() primeiro.');
        }
        return this.db;
    }

    private saveTimeout: NodeJS.Timeout | null = null;
    private readonly SAVE_DELAY_MS = 1000; // Delay de 1 segundo para debounce de escrita

    /**
     * Agenda a persistência da base de dados no disco (Debounce).
     */
    public save(): void {
        if (!this.db) return;

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.flush();
        }, this.SAVE_DELAY_MS);
    }

    /**
     * Força a escrita imediata no disco.
     * Deve ser chamado no encerramento do processo ou em checkpoints críticos.
     */
    public flush(): void {
        if (!this.db) return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            writeFileSync(this.dbPath, buffer);
            this.saveTimeout = null;
        } catch (err) {
            console.error(`[V2] ❌ Falha ao persistir base de dados:`, err);
        }
    }

    // --- Métodos Auxiliares de Consulta ---

    public query(sql: string, params: any[] = []): any[] {
        const db = this.getRawDatabase();
        const stmt = db.prepare(sql);
        stmt.bind(params);

        const rows: any[] = [];
        while (stmt.step()) {
            const row: any = {};
            const cols = stmt.getColumnNames();
            const values = stmt.get();
            cols.forEach((col, i) => { row[col] = values[i]; });
            rows.push(row);
        }
        stmt.free();
        return rows;
    }

    private inTransaction: boolean = false;

    public execute(sql: string, params: any[] = []): void {
        const db = this.getRawDatabase();
        db.run(sql, params);
        // Persiste automaticamente apenas se não estivermos no meio de uma transação agrupada
        if (!this.inTransaction && !sql.trim().toUpperCase().startsWith('SELECT')) {
            this.save();
        }
    }

    /**
     * Executa múltiplas instruções sem vinculação de parâmetros.
     * Ideal para scripts de schema e migrações.
     */
    public exec(sql: string): void {
        const db = this.getRawDatabase();
        db.exec(sql);
        if (!this.inTransaction) {
            this.save();
        }
    }

    public prepare(sql: string) {
        return this.getRawDatabase().prepare(sql);
    }

    /**
     * Orquestra uma transação ACID.
     * Garante o encerramento correto do estado 'inTransaction' mesmo em caso de erro.
     */
    public transaction(callback: () => void): void {
        const db = this.getRawDatabase();
        if (this.inTransaction) {
            console.warn('[V2] ⚠️ Transação aninhada detectada (achatamento aplicado).');
            callback();
            return;
        }

        this.inTransaction = true;
        try {
            db.exec('BEGIN TRANSACTION');
            callback();
            db.exec('COMMIT');
            this.inTransaction = false; 
            this.save();
        } catch (error) {
            this.inTransaction = false; 
            try {
                db.exec('ROLLBACK');
            } catch (rbError) {
                console.error('[V2] ❌ Falha no Rollback (transação provavelmente já encerrada):', rbError);
            }
            throw error; 
        }
    }
}