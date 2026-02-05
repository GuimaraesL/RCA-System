import { DatabaseConnection } from './DatabaseConnection';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class MigrationRunner {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public async run(): Promise<void> {
        console.log('[V2] 🔄 Checking Migrations...');

        await this.ensureBaseSchema();
        await this.runVersionedMigrations();

        console.log('[V2] ✅ Migrations Check Complete');
    }

    private async ensureBaseSchema(): Promise<void> {
        // Resolve path to original schema.sql
        // server/src/v2/infrastructure/database -> ../../../../server/src/db/schema.sql
        const schemaPath = join(__dirname, '..', '..', '..', '..', 'src', 'db', 'schema.sql');

        if (existsSync(schemaPath)) {
            const schema = readFileSync(schemaPath, 'utf-8');
            this.db.execute(schema);
            // console.log('[V2] Base schema checked/applied.');
        } else {
            console.error(`[V2] ❌ Schema file not found at: ${schemaPath}`);
            throw new Error('Schema file missing');
        }
    }

    private async runVersionedMigrations(): Promise<void> {
        // Replicate logic from server/src/db/database.ts
        // In a real scenario, we would use a _migrations table, 
        // but for compatibility we mimic the "Try/Catch/Ignore" pattern of V1 for now
        // to avoid locking the DB with a new table that V1 doesn't know about yet.

        const migrations = [
            {
                name: 'v1.1: Add file_path to triggers',
                up: "ALTER TABLE triggers ADD COLUMN file_path TEXT"
            },
            {
                name: 'v1.2: Add file_path to rcas',
                up: "ALTER TABLE rcas ADD COLUMN file_path TEXT"
            },
            {
                name: 'v1.3: Add five_whys_chains to rcas',
                up: "ALTER TABLE rcas ADD COLUMN five_whys_chains TEXT"
            },
            {
                name: 'v1.4: Add created_at to actions',
                up: "ALTER TABLE actions ADD COLUMN created_at TEXT"
            },
            {
                name: 'v1.5: Add updated_at to actions',
                up: "ALTER TABLE actions ADD COLUMN updated_at TEXT"
            }
        ];

        for (const migration of migrations) {
            try {
                this.db.execute(migration.up);
                console.log(`[V2] ✅ Applied: ${migration.name}`);
            } catch (e: any) {
                // Ignore if duplicate column (already applied)
                if (!e.message.includes("duplicate column")) {
                    console.log(`[V2] ℹ️ Skipped: ${migration.name} (${e.message})`);
                }
            }
        }
    }
}
