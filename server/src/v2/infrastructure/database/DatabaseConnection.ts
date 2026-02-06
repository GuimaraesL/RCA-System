import initSqlJs, { Database, QueryExecResult } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export class DatabaseConnection {
    private static instance: DatabaseConnection;
    private db: Database | null = null;
    private dbPath: string;

    private constructor() {
        // Resolve path: server/data/rca.db
        const DATA_DIR = join(__dirname, '..', '..', '..', '..', 'data');
        this.dbPath = this.resolveDbPath(DATA_DIR);
        console.log(`[V2] 💾 Database Path Resolved: ${this.dbPath}`);
    }

    public static getInstance(): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    private resolveDbPath(dataDir: string): string {
        // 1. Try standard relative path
        let path = join(dataDir, 'rca.db');

        // 2. Fallback logic similar to original implementation
        if (!existsSync(dirname(path))) {
            console.warn(`[V2] ⚠️ Data dir not found at ${dirname(path)}, trying CWD...`);
            const cwd = process.cwd();
            if (cwd.endsWith('server')) {
                path = join(cwd, 'data', 'rca.db');
            } else {
                path = join(cwd, 'server', 'data', 'rca.db');
            }
        }
        return path;
    }

    public async initialize(): Promise<void> {
        if (this.db) return;

        // Ensure directory exists
        const dir = dirname(this.dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        const SQL = await initSqlJs();

        if (existsSync(this.dbPath)) {
            const buffer = readFileSync(this.dbPath);
            this.db = new SQL.Database(buffer);
            // console.log(`[V2] 📂 Database loaded: ${this.dbPath}`);
        } else {
            this.db = new SQL.Database();
            // console.log(`[V2] 📂 New database created: ${this.dbPath}`);
            // Note: Schema initialization should be handled by MigrationRunner
        }
    }

    public getRawDatabase(): Database {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }



    public save(): void {
        if (!this.db) return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            writeFileSync(this.dbPath, buffer);
            // console.log(`[V2] 💾 Database saved: ${this.dbPath}`); 
        } catch (err) {
            console.error(`[V2] ❌ Failed to save database:`, err);
            throw err;
        }
    }

    // --- Helper Methods ---

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
        // Only save if it's a modification AND we are not in a transaction
        if (!this.inTransaction && !sql.trim().toUpperCase().startsWith('SELECT')) {
            this.save();
        }
    }

    /**
     * Executes multiple statements without parameter binding.
     * Ideal for schema scripts.
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

    public transaction(callback: () => void): void {
        const db = this.getRawDatabase();
        if (this.inTransaction) {
            // Check for nested transaction attempt (not supported by this simple flag, but sql.js supports savepoints)
            // For now, just execute callback directly - we trust the outer transaction to commit/rollback
            // or we could throw "Nested transactions not supported by this simple wrapper"
            console.warn('[V2] ⚠️ Nested transaction detected (flattening).');
            callback();
            return;
        }

        this.inTransaction = true;
        try {
            db.exec('BEGIN TRANSACTION');
            callback();
            db.exec('COMMIT');
            this.inTransaction = false; // Reset before save
            this.save();
        } catch (error) {
            this.inTransaction = false; // Reset before rollback/throw
            try {
                db.exec('ROLLBACK');
            } catch (rbError) {
                console.error('[V2] ❌ Rollback failed (transaction likely already closed):', rbError);
            }
            throw error; // Re-throw the ORIGINAL error so we know what happened
        }
    }
}
