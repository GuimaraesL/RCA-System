const fs = require('fs');
const initSqlJs = require('./node_modules/sql.js');

async function checkDb() {
    const filebuffer = fs.readFileSync('./server/data/rca.db');
    const SQL = await initSqlJs();
    const db = new SQL.Database(filebuffer);

    const stmt = db.prepare("SELECT config FROM taxonomy");
    while (stmt.step()) {
        const row = stmt.getAsObject();
        const config = JSON.parse(row.config);
        console.log("Found Taxonomy Config.");
        console.log("Failure Modes Count:", config.failureModes.length);
        console.log("Sample Modes:", JSON.stringify(config.failureModes.slice(0, 5), null, 2));
    }
}

checkDb();
