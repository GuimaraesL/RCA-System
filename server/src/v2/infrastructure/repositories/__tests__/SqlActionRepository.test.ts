
import { describe, it, expect, beforeEach } from 'vitest';
import { SqlActionRepository } from '../SqlActionRepository';
import { DatabaseConnection } from '../../database/DatabaseConnection';
import { Action } from '../../../domain/types/RcaTypes';

describe('SqlActionRepository Integration Test', () => {
    let repo: SqlActionRepository;

    beforeEach(async () => {
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();

        // Setup clean actions table
        db.run("DROP TABLE IF EXISTS actions");
        db.run(`CREATE TABLE actions (
            id TEXT PRIMARY KEY,
            rca_id TEXT,
            action TEXT,
            responsible TEXT,
            date TEXT,
            status TEXT,
            moc_number TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        repo = new SqlActionRepository();
    });

    it('should create and find an action by ID', () => {
        const action: Action = {
            id: 'ACT-001',
            rca_id: 'RCA-001',
            action: 'Test Action',
            responsible: 'John Doe',
            date: '2023-01-01',
            status: '1'
        };

        repo.create(action);
        const found = repo.findById('ACT-001');

        expect(found).toBeDefined();
        expect(found?.action).toBe('Test Action');
        expect(found?.rca_id).toBe('RCA-001');
    });

    it('should find actions by RCA ID', () => {
        const actions: Action[] = [
            { id: 'ACT-1', rca_id: 'RCA-X', action: 'A1', responsible: 'U1', date: 'D1', status: '1' },
            { id: 'ACT-2', rca_id: 'RCA-X', action: 'A2', responsible: 'U2', date: 'D2', status: '2' },
            { id: 'ACT-3', rca_id: 'RCA-Y', action: 'A3', responsible: 'U3', date: 'D3', status: '3' }
        ];

        actions.forEach(a => repo.create(a));

        const rcaXActions = repo.findByRcaId('RCA-X');
        expect(rcaXActions.length).toBe(2);
        expect(rcaXActions.map(a => a.id)).toContain('ACT-1');
        expect(rcaXActions.map(a => a.id)).toContain('ACT-2');
    });

    it('should update an existing action', () => {
        const action: Action = { id: 'ACT-U', rca_id: 'RCA-1', action: 'Old', responsible: 'R', date: 'D', status: '1' };
        repo.create(action);

        const updatedAction = { ...action, action: 'New', status: '3' };
        repo.update(updatedAction);

        const found = repo.findById('ACT-U');
        expect(found?.action).toBe('New');
        expect(found?.status).toBe('3');
    });

    it('should delete an action', () => {
        const action: Action = { id: 'ACT-D', rca_id: 'RCA-1', action: 'Delete', responsible: 'R', date: 'D', status: '1' };
        repo.create(action);
        expect(repo.findById('ACT-D')).toBeDefined();

        repo.delete('ACT-D');
        expect(repo.findById('ACT-D')).toBeNull();
    });

    it('should support bulk create', () => {
        const batch: Action[] = [
            { id: 'B1', rca_id: 'R1', action: 'A1', responsible: 'R1', date: 'D1', status: '1' },
            { id: 'B2', rca_id: 'R1', action: 'A2', responsible: 'R2', date: 'D2', status: '2' }
        ];

        repo.bulkCreate(batch);
        const all = repo.findByRcaId('R1');
        expect(all.length).toBe(2);
    });

    it('should support bulk delete', () => {
        const batch: Action[] = [
            { id: 'BD1', rca_id: 'R1', action: 'A1', responsible: 'R1', date: 'D1', status: '1' },
            { id: 'BD2', rca_id: 'R1', action: 'A2', responsible: 'R2', date: 'D2', status: '2' },
            { id: 'BD3', rca_id: 'R1', action: 'A3', responsible: 'R3', date: 'D3', status: '3' }
        ];

        repo.bulkCreate(batch);
        repo.bulkDelete(['BD1', 'BD3']);

        const remaining = repo.findByRcaId('R1');
        expect(remaining.length).toBe(1);
        expect(remaining[0].id).toBe('BD2');
    });
});
