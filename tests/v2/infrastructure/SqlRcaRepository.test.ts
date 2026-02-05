import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { SqlRcaRepository } from '../../../server/src/v2/infrastructure/repositories/SqlRcaRepository';
import { DatabaseConnection } from '../../../server/src/v2/infrastructure/database/DatabaseConnection';
import { MigrationRunner } from '../../../server/src/v2/infrastructure/database/MigrationRunner';
import { join } from 'path';
import fs from 'fs';

// Mock path resolution to force a test database

describe('SqlRcaRepository Integration', () => {
    let repository: SqlRcaRepository;

    beforeAll(async () => {
        // Initialize DB
        // For safety, we should ideally use a test DB file, but DatabaseConnection logic is hardcoded to server/data
        // We can mock the resolveDbPath method if we want, or just rely on the fact that V2 doesn't touch V1 unless specified.
        // But DatabaseConnection.ts points to the REAL data/rca.db.
        // WARNING: Running this test will interact with the REAL DB if we don't mock.

        // Let's Mock DatabaseConnection.resolveDbPath to point to a temp file
        vi.spyOn(DatabaseConnection.prototype as any, 'resolveDbPath').mockImplementation(() => {
            return join(__dirname, 'test_rca.db');
        });

        const migrator = new MigrationRunner();
        // We need to bypass the strict schema location check in MigrationRunner for tests or allow it to read from real src
        await DatabaseConnection.getInstance().initialize();
        await migrator.run();
    });

    beforeEach(() => {
        repository = new SqlRcaRepository();
        // Clear table
        DatabaseConnection.getInstance().execute('DELETE FROM rcas');
    });

    it('should create and find an RCA', () => {
        const rca = {
            id: 'TEST-001',
            what: 'Integration Test'
        };

        repository.create(rca);

        const found = repository.findById('TEST-001');
        expect(found).not.toBeNull();
        expect(found?.what).toBe('Integration Test');
        expect(found?.participants).toEqual([]); // Default value
    });

    it('should update an RCA', () => {
        repository.create({ id: 'TEST-002', status: 'Draft' });

        const rca = repository.findById('TEST-002');
        if (!rca) throw new Error('Failed to create');

        rca.status = 'Final';
        repository.update(rca);

        const updated = repository.findById('TEST-002');
        expect(updated?.status).toBe('Final');
    });

    it('should delete an RCA', () => {
        repository.create({ id: 'TEST-003' });
        repository.delete('TEST-003');

        const found = repository.findById('TEST-003');
        expect(found).toBeNull();
    });
});
