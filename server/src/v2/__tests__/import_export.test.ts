
import { describe, it, expect, beforeEach } from 'vitest';
import { RcaService } from '../domain/services/RcaService';
import { SqlRcaRepository } from '../infrastructure/repositories/SqlRcaRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Rca, TaxonomyConfig } from '../domain/types/RcaTypes';
import fs from 'fs';
import path from 'path';

// Load real data sample
const MIGRATION_FILE = path.resolve(__dirname, '../../../../tests/data/rca_migration_v17_consolidated.json');

describe('Import/Export Data Validation', () => {
    let service: RcaService;
    let repo: SqlRcaRepository;
    let sampleData: any[];

    // Taxonomy mock for validation
    const mockTaxonomy: TaxonomyConfig = {
        analysisStatuses: [
            { id: 'STATUS-01', name: 'Em Andamento' },
            { id: 'STATUS-03', name: 'Concluída' }
        ],
        mandatoryFields: { rca: { create: [], conclude: [] } },
        analysisTypes: [], specialties: [], failureModes: [], failureCategories: [],
        componentTypes: [], rootCauseMs: [], triggerStatuses: []
    };

    beforeEach(async () => {
        // Init isolated DB
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();

        // Recreate schema to ensure isolation and cleanliness
        db.run("DROP TABLE IF EXISTS rcas");
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
        // Actions table not strictly needed for this import test unless data has actions, but good practice
        db.run(`CREATE TABLE IF NOT EXISTS actions (
            id TEXT PRIMARY KEY, rca_id TEXT, action TEXT, 
            responsible TEXT, date TEXT, status TEXT, moc_number TEXT
        )`);

        repo = new SqlRcaRepository();
        service = new RcaService(repo);

        // Read file
        if (fs.existsSync(MIGRATION_FILE)) {
            const content = fs.readFileSync(MIGRATION_FILE, 'utf-8');
            const json = JSON.parse(content);
            sampleData = json.records || []; // Handle { metadata, records: [] } structure
        } else {
            console.warn("⚠️ Migration file not found, skipping data load.");
            sampleData = [];
        }
    });

    it('should successfully import V17 consolidated data samples', () => {
        if (sampleData.length === 0) {
            console.warn("Skipping test due to missing data file");
            return;
        }

        // Test with first 10 records
        const batch = sampleData.slice(0, 10);
        console.log(`Testing import of ${batch.length} records...`);

        for (const rawRecord of batch) {
            // Simulate Import Process: Map raw JSON -> Service Create/Migrate
            // The service already has migrateRcaData logic which should handle this
            const result = service.createRca(rawRecord, mockTaxonomy);

            expect(result.rca).toBeDefined();
            expect(result.rca.id).toBe(rawRecord.id); // Should preserve ID

            // Validate Logic Preservation
            if (rawRecord.what) {
                expect(result.rca.what).toBe(rawRecord.what);
            }

            // Validate Complex Fields (Arrays/Objects)
            expect(Array.isArray(result.rca.root_causes)).toBe(true);
            if (rawRecord.root_causes && rawRecord.root_causes.length > 0) {
                expect(result.rca.root_causes!.length).toBeGreaterThan(0);
                expect(result.rca.root_causes![0].cause).toBeDefined();
            }

            console.log(`✅ Imported ${result.rca.id} - ${result.rca.what?.substring(0, 30)}...`);
        }

        // Verify Persistence Count
        const all = repo.findAll();
        expect(all.length).toBe(batch.length);
    });

    it('should handle special fields (Ishikawa, 5 Whys) correctly', () => {
        // Find a record with Ishikawa data
        const recordWithIshikawa = sampleData.find(r => r.ishikawa && (r.ishikawa.machine?.length > 0));

        if (!recordWithIshikawa) {
            console.warn("No sample with Ishikawa data found to test");
            return;
        }

        const result = service.createRca(recordWithIshikawa, mockTaxonomy);
        const saved = repo.findById(result.rca.id!);

        expect(saved).toBeDefined();
        expect(saved?.ishikawa).toBeDefined();
        // Check deep property
        expect(saved?.ishikawa?.machine?.length).toBeGreaterThan(0);
        expect(saved?.ishikawa?.machine[0]).toBe(recordWithIshikawa.ishikawa.machine[0]);
        console.log("✅ Ishikawa structure preserved");
    });
});
