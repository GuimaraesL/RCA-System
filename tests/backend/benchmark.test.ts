
import { describe, it, expect, beforeEach } from 'vitest';
import { RcaService } from '../../server/src/v2/domain/services/RcaService';
import { SqlRcaRepository } from '../../server/src/v2/infrastructure/repositories/SqlRcaRepository';
import { DatabaseConnection } from '../../server/src/v2/infrastructure/database/DatabaseConnection';
import { Rca, TaxonomyConfig } from '../../server/src/v2/domain/types/RcaTypes';
import { randomUUID } from 'crypto';

describe('Performance Benchmark (V2 Core)', () => {
    let repo: SqlRcaRepository;

    const generateBatch = (count: number): Rca[] => {
        return Array.from({ length: count }).map((_, i) => ({
            id: randomUUID(),
            what: `Benchmark Item ${i}`,
            status: 'STATUS-01',
            participants: [],
            root_causes: [],
            created_at: new Date().toISOString()
        } as unknown as Rca));
    };

    beforeEach(async () => {
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();
        db.run("DROP TABLE IF EXISTS rcas");
        // Use simplified schema for speed, strictly need columns used by repo mapping though
        // Copying schema from previous tests to ensure compatibility
        db.run(`CREATE TABLE rcas (
            id TEXT PRIMARY KEY, what TEXT, status TEXT, 
            participants TEXT, root_causes TEXT, 
            analysis_type TEXT, problem_description TEXT, subgroup_id TEXT,
            who TEXT, "when" TEXT, where_description TEXT,
            specialty_id TEXT, failure_mode_id TEXT, failure_category_id TEXT,
            component_type TEXT, downtime_minutes REAL, financial_impact REAL,
            completion_date TEXT,
            created_at TEXT, updated_at TEXT, file_path TEXT, five_whys TEXT, five_whys_chains TEXT,
            ishikawa TEXT, precision_maintenance TEXT, human_reliability TEXT,
            containment_actions TEXT, lessons_learned TEXT, additional_info TEXT,
            version INTEGER, analysis_date TEXT, analysis_duration_minutes REAL,
            facilitator TEXT, start_date TEXT, requires_operation_support INTEGER,
            failure_date TEXT, failure_time TEXT, os_number TEXT,
            area_id TEXT, equipment_id TEXT, asset_name_display TEXT,
            potential_impacts TEXT, quality_impacts TEXT,
            general_moc_number TEXT
        )`);

        repo = new SqlRcaRepository();
    });

    it('should handle 1000 records operations within acceptable limits', () => {
        const BATCH_SIZE = 1000;
        const data = generateBatch(BATCH_SIZE);

        // 1. Bulk Create
        const startCreate = performance.now();
        repo.bulkCreate(data);
        const endCreate = performance.now();
        const createTime = endCreate - startCreate;
        console.log(`⏱️ Bulk Create (1000 items): ${createTime.toFixed(2)}ms`);

        // Assert: Should be reasonably fast (e.g., < 2000ms for in-memory, file I/O might be slower but transaction fix handles it)
        // With transaction fix, this should be very fast. Without it, it would be slow.
        expect(createTime).toBeLessThan(2000);

        // 2. Read All
        const startRead = performance.now();
        const all = repo.findAll();
        const endRead = performance.now();
        const readTime = endRead - startRead;
        console.log(`⏱️ Read All (1000 items): ${readTime.toFixed(2)}ms`);

        expect(all.length).toBe(BATCH_SIZE);
        expect(readTime).toBeLessThan(500); // Reading is usually fast

        // 3. Bulk Delete
        const ids = all.map(r => r.id);
        const startDelete = performance.now();
        repo.bulkDelete(ids);
        const endDelete = performance.now();
        const deleteTime = endDelete - startDelete;
        console.log(`⏱️ Bulk Delete (1000 items): ${deleteTime.toFixed(2)}ms`);

        expect(repo.findAll().length).toBe(0);
        expect(deleteTime).toBeLessThan(2000);
    });
});
