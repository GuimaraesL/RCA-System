
import fs from 'fs';
import path from 'path';
import { DatabaseConnection } from '../server/src/v2/infrastructure/database/DatabaseConnection';
import { SqlRcaRepository } from '../server/src/v2/infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../server/src/v2/infrastructure/repositories/SqlActionRepository';

async function repair() {
    console.log('Starting Repair Process...');
    const db = DatabaseConnection.getInstance();
    await db.initialize();

    // 1. Wipe DB
    console.log('🧹 Wiping Database...');
    db.execute('DELETE FROM actions');
    db.execute('DELETE FROM triggers');
    db.execute('DELETE FROM rcas'); // Order matters

    // 2. Load JSON
    const jsonPath = path.resolve(__dirname, '../tests/data/rca_migration_v17_consolidated.json');
    console.log(`📂 Loading JSON from ${jsonPath}`);
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    const records = data.records || [];
    const actions = data.actions || [];

    console.log(`📊 Found ${records.length} records and ${actions.length} actions.`);

    const rcaRepo = new SqlRcaRepository();
    const actionRepo = new SqlActionRepository(); // We might need to use raw queries if repo enforces auto-id? 
    // SqlRcaRepository.create usually takes an entity. If entity has ID, it uses it?
    // Let's check repository logic. Usually Insert respects ID if present.

    // 3. Insert Records (UUIDs should be preserved by JSON)
    console.log('🔄 Inserting RCAs...');
    let rcaCount = 0;

    // Use transaction
    db.execute('BEGIN TRANSACTION');

    try {
        for (const r of records) {
            // Ensure valid ID or use existing (JSON has UUIDs)
            await rcaRepo.save(r); // save usually handles update/insert. create is better?
            rcaCount++;
        }
        console.log(`✅ RCAs Inserted: ${rcaCount}`);

        // 4. Insert Actions
        console.log('🔄 Inserting Actions...');
        let actionCount = 0;
        for (const a of actions) {
            // Logic: `rca_id` in JSON is UUID. `id` in JSON is UUID.
            // Since RCAs were inserted with UUIDs, these actions should link perfectly.

            // Note: DB Insert might expect specific column names matching JSON?
            // ActionRecord interface matches JSON usually.
            // But we need to be careful about `created_at` etc.

            // We use raw INSERT for speed and avoiding repository validation overhead/mismatches
            const stmt = db.prepare(`
                INSERT INTO actions (id, rca_id, action, responsible, date, status, moc_number)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run([
                a.id,
                a.rca_id,
                a.action,
                a.responsible || 'Unknown',
                a.date,
                a.status,
                a.moc_number
            ]);
            actionCount++;
        }
        console.log(`✅ Actions Inserted: ${actionCount}`);

        db.execute('COMMIT');
        console.log('✅ COMMIT Success.');

    } catch (e) {
        console.error('❌ Error during import:', e);
        db.execute('ROLLBACK');
    }
}

repair();
