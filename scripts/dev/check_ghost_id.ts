// @ts-nocheck
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../server/data/rca.db');
const db = new Database(dbPath, { verbose: console.log });

const targetId = 'a6712796-ebb7-4ee1-b4d3-08697e1b5e20';

console.log(`🔍 Checking for ID: ${targetId}`);

const rca = db.prepare('SELECT * FROM rcas WHERE id = ?').get(targetId);
if (rca) {
    console.log('✅ Found in RCAs:', rca);
} else {
    console.log('❌ NOT Found in RCAs');
}

const trigger = db.prepare('SELECT * FROM triggers WHERE id = ?').get(targetId);
if (trigger) {
    console.log('✅ Found in Triggers:', trigger);
} else {
    console.log('❌ NOT Found in Triggers');
}

// Check partial matches or path matches
console.log('\n--- Checking partial matches in file_paths ---');
const similar = db.prepare('SELECT id, file_path FROM rcas WHERE file_path LIKE ?').all(`%${targetId}%`);
if (similar.length > 0) {
    console.log('Found RCAs with ID in file_path:', similar);
} else {
    console.log('No RCAs found with ID in file_path');
}
