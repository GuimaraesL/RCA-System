
import { describe, it, expect, beforeEach } from 'vitest';
import { SqlTriggerRepository } from '../infrastructure/repositories/SqlTriggerRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Trigger } from '../domain/types/RcaTypes';

describe('SqlTriggerRepository Integration Test', () => {
    let repo: SqlTriggerRepository;

    beforeEach(async () => {
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();

        // Setup clean triggers table using the current schema.sql logic (manually replicated for isolation)
        db.run("DROP TABLE IF EXISTS triggers");
        db.run(`CREATE TABLE triggers (
            id TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            start_date TEXT,
            end_date TEXT,
            status TEXT,
            file_path TEXT
        )`);

        repo = new SqlTriggerRepository();
    });

    it('should fail when creating a trigger with the full schema (proving the discrepancy)', () => {
        const trigger: Trigger = {
            id: 'TRG-TEST-001',
            area_id: 'AREA-01',
            start_date: '2023-01-01T10:00',
            end_date: '2023-01-01T11:00',
            status: 'OPEN',
            stop_type: 'Mechanical',
            stop_reason: 'Bearing failure',
            duration_minutes: 60
        };

        // This is expected to throw because 'area_id' and other columns don't exist in the 'triggers' table created above
        expect(() => repo.create(trigger)).toThrow();
    });
});
