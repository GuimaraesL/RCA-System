// Conexão e inicialização do banco SQLite com sql.js
// sql.js é uma porta JavaScript pura do SQLite (não requer compilação)

import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Caminho do banco de dados
const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DATA_DIR, 'rca.db');

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
        writeFileSync(DB_PATH, buffer);
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
