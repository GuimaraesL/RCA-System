// Conexão e inicialização do banco SQLite com sql.js
// sql.js é uma porta JavaScript pura do SQLite (não requer compilação)

import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// Caminho do banco de dados
const DATA_DIR = join(__dirname, '..', '..', 'data');
// Fallback: Tentar resolver baseado no CWD se o caminho relativo falhar
const resolveDbPath = () => {
    // 1. Tentar via __dirname (padrão)
    let path = join(DATA_DIR, 'rca.db');

    // 2. Se o diretório não existe, tentar via process.cwd()
    if (!existsSync(dirname(path))) {
        console.warn(`⚠️ Data dir not found at ${dirname(path)}, trying CWD...`);
        const cwd = process.cwd();
        if (cwd.endsWith('server')) {
            path = join(cwd, 'data', 'rca.db');
        } else {
            path = join(cwd, 'server', 'data', 'rca.db');
        }
    }
    return path;
};

const DB_PATH = resolveDbPath();
console.log(`💾 Database Path Resolved: ${DB_PATH}`);

let db: Database;

/**
 * Inicializa o banco de dados SQLite
 * Cria as tabelas se não existirem
 */
export const initDatabase = async (): Promise<Database> => {
    // Criar diretório data se não existir
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }

    // Inicializar sql.js
    const SQL = await initSqlJs();

    // Carregar banco existente ou criar novo
    if (existsSync(DB_PATH)) {
        const buffer = readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log(`📂 Banco carregado: ${DB_PATH}`);
    } else {
        db = new SQL.Database();
        console.log(`📂 Novo banco criado: ${DB_PATH}`);
    }

    // Executar schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.run(schema);

    // --- MIGRATIONS ---
    try {
        // v1.1: Add file_path to triggers
        db.run("ALTER TABLE triggers ADD COLUMN file_path TEXT");
        console.log("✅ Migration v1.1 applied: Added file_path to triggers");
    } catch (e: any) {
        // Ignore duplicate column error
        if (!e.message.includes("duplicate column")) {
            console.log("ℹ️ Migration v1.1 skipped or already applied.");
        }
    }

    try {
        // v1.2: Add file_path to rcas
        db.run("ALTER TABLE rcas ADD COLUMN file_path TEXT");
        console.log("✅ Migration v1.2 applied: Added file_path to rcas");
    } catch (e: any) {
        // Ignore duplicate column error, means it already exists
        if (!e.message.includes("duplicate column")) {
            console.log("ℹ️ Migration v1.2 skipped (likely already exists) or error: " + e.message);
        }
    }

    // Salvar banco
    saveDatabase();

    return db;
};

/**
 * Salva o banco em disco
 */
export const saveDatabase = (): void => {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        try {
            writeFileSync(DB_PATH, buffer);
            console.log(`💾 Database saved to disk: ${DB_PATH} (${buffer.length} bytes)`);
        } catch (err) {
            console.error(`❌ FAILED to save database to ${DB_PATH}:`, err);
        }
    }
};

/**
 * Retorna a instância do banco
 */
export const getDatabase = (): Database => {
    if (!db) {
        throw new Error('Banco não inicializado. Chame initDatabase() primeiro.');
    }
    return db;
};

export default { initDatabase, getDatabase, saveDatabase };
