const { initDatabase, getDatabase } = require('./server/dist/db/database');
const { DatabaseConnection } = require('./server/dist/v2/infrastructure/database/DatabaseConnection');

// Since this is a script, we use the compiled JS if it exists, 
// or we use ts-node wrapper.
// Let's use the actual code logic.

async function check() {
    try {
        console.log('--- CONSISTENCY CHECK ---');

        // 1. Initialize V1
        const v1Db = await initDatabase();
        const v1Count = v1Db.exec('SELECT COUNT(*) FROM rcas')[0].values[0][0];
        console.log('V1 RCA Count:', v1Count);

        // 2. Initialize V2 singleton
        const v2 = DatabaseConnection.getInstance();

        // Check if v2 already has a db (it shouldn't unless it auto-initialized)
        console.log('V2 has DB before bridge:', !!v2.db);

        // 3. Bridge V1 -> V2
        v2.setRawDatabase(v1Db);
        console.log('V2 has DB after bridge:', !!v2.db);

        // 4. Check V2 count
        const v2Count = v2.query('SELECT COUNT(*) FROM rcas')[0]['COUNT(*)'];
        console.log('V2 RCA Count:', v2Count);

        if (v1Count === v2Count) {
            console.log('✅ Counts match!');
        } else {
            console.log('❌ Counts MISMATCH!');
        }

    } catch (e) {
        console.error('Check failed:', e);
    }
}

check();
