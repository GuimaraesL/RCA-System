const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function run() {
    try {
        const dbPath = path.resolve('server/data/rca.db');
        console.log('Checking DB at:', dbPath);

        if (!fs.existsSync(dbPath)) {
            console.log('❌ DB file does not exist');
            return;
        }

        const SQL = await initSqlJs();
        const buffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        const tables = ['rcas', 'triggers', 'actions', 'assets'];
        for (const table of tables) {
            try {
                const res = db.exec(`SELECT COUNT(*) FROM ${table}`);
                console.log(`Table [${table}]: ${res[0].values[0][0]} rows`);
            } catch (e) {
                console.log(`Table [${table}]: ERROR - ${e.message}`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
