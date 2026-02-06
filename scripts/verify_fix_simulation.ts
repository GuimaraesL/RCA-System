
import { SqlRcaRepository } from '../server/src/v2/infrastructure/repositories/SqlRcaRepository';
import { DatabaseConnection } from '../server/src/v2/infrastructure/database/DatabaseConnection';
import { MigrationRunner } from '../server/src/v2/infrastructure/database/MigrationRunner';
import { join } from 'path';
import { existsSync, unlinkSync, readFileSync } from 'fs';

async function runSimulation() {
    console.log('--- BULK IMPORT SIMULATION ---');

    // 1. Setup Test DB
    const TEST_DB_PATH = join(__dirname, 'simulation.db');
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);

    // Configure V2 Database
    const db = DatabaseConnection.getInstance();
    db.setDbPath(TEST_DB_PATH);
    console.log('Test DB Path:', TEST_DB_PATH);

    // Run Migrations (Create Tables)
    const runner = new MigrationRunner();
    await runner.run();

    // 2. Initialize Repo
    const repo = new SqlRcaRepository();

    // 3. Load Real Data
    const jsonPath = join(__dirname, '../tests/data/rca_migration_v17_consolidated.json');
    if (!existsSync(jsonPath)) {
        console.error('❌ Data file not found:', jsonPath);
        process.exit(1);
    }

    const rawArgs = readFileSync(jsonPath, 'utf-8');
    const json = JSON.parse(rawArgs);
    const records = json.records || json;

    console.log(`Loading ${records.length} records from JSON...`);

    // 4. Execute Bulk Create (The Fix)
    try {
        const start = Date.now();
        repo.bulkCreate(records);
        const duration = Date.now() - start;
        console.log(`✅ Bulk Create Success! Took ${duration}ms`);
    } catch (e) {
        console.error('❌ Bulk Create Failed:', e);
        process.exit(1);
    }

    // 5. Verification
    const saved = repo.findAll();
    console.log(`Database now contains ${saved.length} records.`);

    if (saved.length === records.length) {
        console.log('✨ SUCCESS: Count matches input.');
    } else {
        console.error('⚠️ MISMATCH: Count does not match input.');
    }

    // Cleanup
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
    console.log('--- SIMULATION COMPLETE ---');
}

runSimulation();
