
import { describe, it, expect, beforeEach } from 'vitest';
import { RcaService } from '../domain/services/RcaService';
import { SqlRcaRepository } from '../infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../infrastructure/repositories/SqlActionRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Rca, TaxonomyConfig } from '../domain/types/RcaTypes';

describe('RCA Logic Regression Tests (Status Transitions)', () => {
    let service: RcaService;
    let rcaRepo: SqlRcaRepository;
    let actionRepo: SqlActionRepository;

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
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();

        // Setup DB
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

        db.run("DROP TABLE IF EXISTS actions");
        db.run(`CREATE TABLE actions (
            id TEXT PRIMARY KEY, rca_id TEXT, action TEXT, 
            responsible TEXT, date TEXT, status TEXT, moc_number TEXT
        )`);

        rcaRepo = new SqlRcaRepository();
        actionRepo = new SqlActionRepository();
        service = new RcaService(rcaRepo, actionRepo);
    });

    it('should regress status from Concluída to Em Andamento if mandatory data is removed', () => {
        // 1. Create Complete RCA
        const rcaData: Partial<Rca> = {
            what: 'Failure X',
            participants: ['User A'],
            root_causes: [{ id: '1', cause: 'Cause A' }]
        };
        const create = service.createRca(rcaData, mockTaxonomy);
        expect(create.rca.status).toBe('STATUS-03'); // Should be concluded initially

        // 2. Remove mandatory Root Cause
        const updateData: Partial<Rca> = {
            ...create.rca,
            root_causes: [] // Empty it
        };

        const update = service.updateRca(create.rca.id!, updateData, mockTaxonomy);

        // 3. Verify Regression
        expect(update.rca.status).toBe('STATUS-01'); // Back to In Progress
        expect(update.statusReason).toContain('Missing: root_causes');
    });

    it('should stay in Aguardando Verificação if Actions are pending', () => {
        // 1. Create RCA (In Progress initially due to missing fields)
        const rcaId = 'rca-with-actions';
        service.createRca({ id: rcaId, what: 'Has Actions' }, mockTaxonomy);

        // 2. Create Pending Action
        actionRepo.create({
            id: 'act-1',
            rca_id: rcaId,
            action: 'Fix it',
            status: 'PENDING', // Not '3' or '4' (Effective)
            responsible: 'Bob', date: '2023-01-01'
        });

        // 3. Update RCA to have ALL mandatory fields
        const rca = rcaRepo.findById(rcaId)!;
        const updateData = {
            ...rca,
            participants: ['Team'],
            root_causes: [{ id: '1', cause: 'Root' }]
        };

        const result = service.updateRca(rcaId, updateData, mockTaxonomy);

        // 4. Verify Status is NOT Concluded, but Waiting
        expect(result.rca.status).toBe('STATUS-WAITING');
        expect(result.statusReason).toBe('Pending verification');
    });

    it('should transition to Concluída only when Action becomes Effective', () => {
        // Setup state from previous test
        const rcaId = 'rca-trans-action';
        service.createRca({
            id: rcaId, what: 'Action Flow',
            participants: ['Team'],
            root_causes: [{ id: '1', cause: 'Root' }]
        }, mockTaxonomy);

        // 1. Add Pending Action -> Status should be Waiting
        actionRepo.create({
            id: 'act-2', rca_id: rcaId, action: 'Fix',
            status: 'PENDING',
            responsible: 'Me', date: '2023-01-01'
        });

        // Trigger update to calc status
        let rca = rcaRepo.findById(rcaId)!;
        let result = service.updateRca(rcaId, rca, mockTaxonomy);
        expect(result.rca.status).toBe('STATUS-WAITING');

        // 2. Update Action to Effective ('3' = Concluded/Effective in our mock logic context or legacy V1)
        // Note: RcaService Checks `['3', '4'].includes(String(a.status))`
        actionRepo.update({
            id: 'act-2', rca_id: rcaId, action: 'Fix',
            status: '3', // Effective
            responsible: 'Me', date: '2023-01-01'
        });

        // 3. Trigger RCA update again (usually happens when entering RCA or saving it)
        result = service.updateRca(rcaId, rca, mockTaxonomy);

        // 4. Verify DONE
        expect(result.rca.status).toBe('STATUS-03');
        expect(result.statusReason).toBe('Complete, actions effective');
    });
});
