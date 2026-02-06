
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'rca.db');
console.log('Opening DB at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the database.');
});

db.serialize(() => {
    // Check RCAs
    db.all("SELECT id, what FROM rcas", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log('--- RCAs in DB ---');
            console.log(`Count: ${rows.length}`);
            rows.forEach(row => console.log(`[${row.id}] ${row.what}`));
        }
    });

    // Check Actions
    db.all("SELECT id, action FROM actions", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log('--- Actions in DB ---');
            console.log(`Count: ${rows.length}`);
        }
    });
});

db.close();
