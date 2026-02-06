
import { describe, it, expect, beforeEach } from 'vitest';
import { RcaService } from '../domain/services/RcaService';
import { SqlRcaRepository } from '../infrastructure/repositories/SqlRcaRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Rca, TaxonomyConfig } from '../domain/types/RcaTypes';

// Use a real in-memory DB for this test, not mocks
describe('V2 Full Flow Integration Test (Service + Repository + DB)', () => {
    let service: RcaService;
    let repo: SqlRcaRepository;

    const mockTaxonomy: TaxonomyConfig = {
        analysisStatuses: [
            { id: 'STATUS-01', name: 'Em Andamento' },
            { id: 'STATUS-WAITING', name: 'Aguardando Verificação' },
            { id: 'STATUS-03', name: 'Concluída' }
        ],
        mandatoryFields: {
            rca: {
                create: ['what'],
                conclude: ['what', 'root_causes', 'participants']
            }
        },
        analysisTypes: [], specialties: [], failureModes: [], failureCategories: [],
        componentTypes: [], rootCauseMs: [], triggerStatuses: []
    };

    beforeEach(async () => {
        // Initialize clean DB
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();

        // Reset table
        const db = dbConn.getRawDatabase();
        db.run("DROP TABLE IF EXISTS rcas");
        db.run(`CREATE TABLE rcas (
            id TEXT PRIMARY KEY, what TEXT, status TEXT, 
            participants TEXT, root_causes TEXT, 
            analysis_type TEXT, -- Needed for logic
            problem_description TEXT, -- Needed for logic
            subgroup_id TEXT, -- Needed for logic
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

        db.run(`CREATE TABLE IF NOT EXISTS actions (
            id TEXT PRIMARY KEY, rca_id TEXT, action TEXT, 
            responsible TEXT, date TEXT, status TEXT, moc_number TEXT
        )`);

        repo = new SqlRcaRepository();
        service = new RcaService(repo);
    });

    it('should complete a full lifecycle: Create -> Auto Logic -> Update -> Delete', () => {
        try {
            // 1. CREATE
            console.error('--- Step 1: Create ---');
            const input: Partial<Rca> = {
                what: 'Integration Test Failure',
                analysis_type: 'Safety'
            };
            const createResult = service.createRca(input, mockTaxonomy);

            expect(createResult.rca.id).toBeDefined();
            expect(createResult.rca.status).toBe('STATUS-01'); // Default start
            console.error(`✅ Created RCA with ID: ${createResult.rca.id}`);

            // Verify Persistence
            const fetched = repo.findById(createResult.rca.id!);
            expect(fetched).toBeDefined();
            expect(fetched?.what).toBe('Integration Test Failure');

            // 2. UPDATE (Trigger Logic)
            console.error('--- Step 2: Update (Logic Check) ---');
            // Add mandatory fields to trigger conclusion logic
            const updatePayload: Partial<Rca> = {
                ...fetched,
                participants: ['Team A'],
                root_causes: [{ id: 'rc1', cause: 'Leak' }]
            };

            console.error("Payload update:", JSON.stringify(updatePayload.root_causes));

            // Actions are fetched internally by service (empty in DB)
            const updateResult = service.updateRca(createResult.rca.id!, updatePayload, mockTaxonomy);

            console.error(`DEBUG: Update Status: ${updateResult.rca.status}`);
            console.error(`DEBUG: Status Reason: ${updateResult.statusReason}`);
            console.error(`DEBUG: Status Changed: ${updateResult.statusChanged}`);

            // Should auto-transition to Concluded (STATUS-03) because mandatory fields are present and no actions
            expect(updateResult.rca.status).toBe('STATUS-03');
            expect(updateResult.statusChanged).toBe(true);
            console.error(`✅ Logic verified: Status transition to ${updateResult.rca.status}`);

            // 3. BULK IDS (Check existence)
            // findAll returns Rca[] directly
            const all = repo.findAll();
            expect(all.length).toBe(1);
            expect(all[0].id).toBe(createResult.rca.id);

            // 4. DELETE
            console.error('--- Step 3: Delete ---');
            const deletionSuccess = service.deleteRca(createResult.rca.id!);
            expect(deletionSuccess).toBe(true);

            const fetchedAfterDelete = repo.findById(createResult.rca.id!);
            expect(fetchedAfterDelete).toBeNull();
            console.error('✅ Deletion verified');
        } catch (e) {
            console.error("❌ TEST FAILED WITH ERROR:", e);
            throw e;
        }
    });

    it('Should support Bulk Import of RCAs (Legacy/Repair Mode)', () => {
        const input: Partial<Rca> = {
            what: 'Integration Test Failure',
            analysis_type: 'Safety'
        };
        const createResult = service.createRca(input, mockTaxonomy);

        // Arrange: Create a batch of RCAs
        const importBatch: Rca[] = [
            {
                ...createResult.rca, // Clone existing structure
                id: 'IMPORT-001',
                what: 'Imported Record 1',
                status: 'Concluída'
            },
            {
                ...createResult.rca,
                id: 'IMPORT-002',
                what: 'Imported Record 2',
                status: 'Cancelada'
            }
        ];

        // Act: Execute bulkCreate directly on repo
        expect(() => repo.bulkCreate(importBatch)).not.toThrow();

        // Assert: Verify they exist
        const all = repo.findAll();
        const imported = all.filter(r => r.id.startsWith('IMPORT-'));
        expect(imported.length).toBe(2);

        const r1 = repo.findById('IMPORT-001');
        expect(r1?.what).toBe('Imported Record 1');

        // Assert: Verify Upsert (running again updates data)
        const updateBatch: Rca[] = [{ ...importBatch[0], what: 'Updated via Import' }];
        repo.bulkCreate(updateBatch);

        const updated = repo.findById('IMPORT-001');
        expect(updated?.what).toBe('Updated via Import');
    });
});
