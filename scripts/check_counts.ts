import { DatabaseConnection } from '../server/src/v2/infrastructure/database/DatabaseConnection';
import { initDatabase } from '../server/src/db/database';

async function diag() {
    try {
        console.log('--- V2 DB CONTENT DIAGNOSTIC ---');

        // 1. Init V1
        const v1Db = await initDatabase();

        // 2. Bridge V2
        const v2 = DatabaseConnection.getInstance();
        v2.setRawDatabase(v1Db);

        const tables = ['rcas', 'actions', 'triggers', 'assets', 'taxonomy'];

        for (const table of tables) {
            try {
                const count = v2.query(`SELECT COUNT(*) as c FROM ${table}`)[0].c;
                console.log(`Table [${table}]: ${count} records`);
            } catch (err) {
                console.error(`Table [${table}]: ERROR - ${err.message}`);
            }
        }

    } catch (e) {
        console.error('Diag failed:', e);
    }
    process.exit(0);
}

diag();
