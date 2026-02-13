import { DatabaseConnection } from '../server/src/v2/infrastructure/database/DatabaseConnection';

async function diag() {
    try {
        console.log('--- V2 DB CONTENT DIAGNOSTIC ---');

        const v2 = DatabaseConnection.getInstance();
        await v2.initialize();

        const tables = ['rcas', 'actions', 'triggers', 'assets', 'taxonomy'];

        for (const table of tables) {
            try {
                const results = v2.query(`SELECT COUNT(*) as c FROM ${table}`);
                const count = results.length > 0 ? results[0].c : 0;
                console.log(`Table [${table}]: ${count} records`);
            } catch (err: any) {
                console.error(`Table [${table}]: ERROR - ${err.message}`);
            }
        }

    } catch (e) {
        console.error('Diag failed:', e);
    }
    process.exit(0);
}

diag();
