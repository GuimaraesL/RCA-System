/**
 * RCA Status Service Unit Tests
 * 
 * These tests ensure the backend status calculation logic
 * has IDENTICAL behavior to the frontend useRcaLogic.ts
 * 
 * @see Issue #20 - Status Synchronization
 */

import rcaStatusService from '../rcaStatusService';

const {
    validateMandatoryFields,
    validateCreateFields,
    calculateRcaStatus,
    migrateRcaData
} = rcaStatusService;

// Mock taxonomy configuration matching real system
const mockTaxonomy = {
    analysisTypes: [
        { id: 'AT-01', name: 'Mini RCA' },
        { id: 'AT-02', name: 'RCA Completo' }
    ],
    analysisStatuses: [
        { id: 'STATUS-01', name: 'Em Andamento' },
        { id: 'STATUS-WAITING', name: 'Aguardando Verificação' },
        { id: 'STATUS-03', name: 'Concluída' }
    ],
    specialties: [{ id: 'SPEC-01', name: 'Mecânica' }],
    failureModes: [{ id: 'FM-01', name: 'Quebra' }],
    failureCategories: [{ id: 'FC-01', name: 'Mecânica' }],
    componentTypes: [{ id: 'CT-01', name: 'Motor' }],
    rootCauseMs: [{ id: 'RC-01', name: 'Máquina' }],
    triggerStatuses: [{ id: 'TS-01', name: 'Novo' }],
    mandatoryFields: {
        trigger: { save: [] },
        rca: {
            create: ['subgroup_id', 'failure_date', 'analysis_type', 'what'],
            conclude: [
                'analysis_type', 'what', 'problem_description', 'subgroup_id', 'who', 'when',
                'where_description', 'specialty_id', 'failure_mode_id', 'failure_category_id',
                'component_type', 'participants', 'root_causes', 'downtime_minutes'
            ]
        }
    }
};

// Complete RCA that should pass all validations
const completeRca = {
    id: 'RCA-001',
    status: 'STATUS-01',
    analysis_type: 'AT-01',
    what: 'Failure Title',
    problem_description: 'Detailed description',
    subgroup_id: 'SG-001',
    who: 'John Doe',
    when: '2024-01-15',
    where_description: 'Line A',
    specialty_id: 'SPEC-01',
    failure_mode_id: 'FM-01',
    failure_category_id: 'FC-01',
    component_type: 'CT-01',
    participants: ['Alice', 'Bob'],
    root_causes: [{ id: 'RC-1', cause: 'Root cause', root_cause_m_id: 'RC-01' }],
    downtime_minutes: 120,
    financial_impact: 0
};

// Incomplete RCA missing required fields
const incompleteRca = {
    id: 'RCA-002',
    status: 'STATUS-01',
    analysis_type: 'AT-01',
    what: 'Failure Title',
    problem_description: '',  // Missing
    subgroup_id: 'SG-001',
    who: '',  // Missing
    when: '',  // Missing
    where_description: '',
    specialty_id: '',
    failure_mode_id: '',
    failure_category_id: '',
    component_type: '',
    participants: [],  // Empty array
    root_causes: [],  // Empty array
    downtime_minutes: null,  // Missing
    financial_impact: 0
};

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('validateMandatoryFields', () => {
    it('should return valid=true when all mandatory fields are complete', () => {
        const result = validateMandatoryFields(completeRca as any, mockTaxonomy);
        expect(result.valid).toBe(true);
        expect(result.missing).toEqual([]);
    });

    it('should return valid=false when mandatory fields are missing', () => {
        const result = validateMandatoryFields(incompleteRca as any, mockTaxonomy);
        expect(result.valid).toBe(false);
        expect(result.missing.length).toBeGreaterThan(0);
    });

    it('should fail validation when participants array is empty', () => {
        const rcaWithEmptyParticipants = { ...completeRca, participants: [] };
        const result = validateMandatoryFields(rcaWithEmptyParticipants as any, mockTaxonomy);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain('participants');
    });

    it('should fail validation when root_causes array is empty', () => {
        const rcaWithNoRootCauses = { ...completeRca, root_causes: [] };
        const result = validateMandatoryFields(rcaWithNoRootCauses as any, mockTaxonomy);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain('root_causes');
    });

    it('should fail validation when downtime_minutes is null', () => {
        const rcaWithNullDowntime = { ...completeRca, downtime_minutes: null };
        const result = validateMandatoryFields(rcaWithNullDowntime as any, mockTaxonomy);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain('downtime_minutes');
    });

    it('should pass validation when downtime_minutes is 0', () => {
        const rcaWithZeroDowntime = { ...completeRca, downtime_minutes: 0 };
        const result = validateMandatoryFields(rcaWithZeroDowntime as any, mockTaxonomy);
        expect(result.valid).toBe(true);
    });

    it('should fail validation when what is empty string', () => {
        const rcaWithEmptyTitle = { ...completeRca, what: '' };
        const result = validateMandatoryFields(rcaWithEmptyTitle as any, mockTaxonomy);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain('what');
    });

    it('should fail validation when what is whitespace only', () => {
        const rcaWithWhitespaceTitle = { ...completeRca, what: '   ' };
        const result = validateMandatoryFields(rcaWithWhitespaceTitle as any, mockTaxonomy);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain('what');
    });

    it('should fail validation when subgroup_id is empty', () => {
        const rcaWithNoSubgroup = { ...completeRca, subgroup_id: '' };
        const result = validateMandatoryFields(rcaWithNoSubgroup as any, mockTaxonomy);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain('subgroup_id');
    });

    it('should fail validation when subgroup_id is null', () => {
        const rcaWithNullSubgroup = { ...completeRca, subgroup_id: null };
        const result = validateMandatoryFields(rcaWithNullSubgroup as any, mockTaxonomy);
        expect(result.valid).toBe(false);
        expect(result.missing).toContain('subgroup_id');
    });
});

// ============================================================================
// STATUS CALCULATION TESTS
// ============================================================================

describe('calculateRcaStatus', () => {
    it('should return STATUS-01 when mandatory fields are missing', () => {
        const actions: any[] = [];
        const result = calculateRcaStatus(incompleteRca as any, actions, mockTaxonomy);

        expect(result.newStatus).toBe('STATUS-01');
        expect(result.reason).toContain('Missing mandatory fields');
    });

    it('should return STATUS-03 (Concluded) when complete and no actions', () => {
        const actions: any[] = [];
        const result = calculateRcaStatus(completeRca as any, actions, mockTaxonomy);

        expect(result.newStatus).toBe('STATUS-03');
        expect(result.reason).toContain('no actions required');
    });

    it('should return STATUS-03 when all actions are effective (status 3 or 4)', () => {
        const actions = [
            { id: 'A1', rca_id: 'RCA-001', status: '3', action: 'Fix', responsible: 'John', date: '2024-01-01' },
            { id: 'A2', rca_id: 'RCA-001', status: '4', action: 'Verify', responsible: 'John', date: '2024-01-01' }
        ];
        const result = calculateRcaStatus(completeRca as any, actions, mockTaxonomy);

        expect(result.newStatus).toBe('STATUS-03');
        expect(result.reason).toContain('all 2 actions effective');
    });

    it('should return STATUS-WAITING when actions are pending', () => {
        const actions = [
            { id: 'A1', rca_id: 'RCA-001', status: '1', action: 'Pending', responsible: 'John', date: '2024-01-01' },
            { id: 'A2', rca_id: 'RCA-001', status: '3', action: 'Done', responsible: 'John', date: '2024-01-01' }
        ];
        const result = calculateRcaStatus(completeRca as any, actions, mockTaxonomy);

        expect(result.newStatus).toBe('STATUS-WAITING');
        expect(result.reason).toContain('pending verification');
    });

    it('should NOT change protected statuses like Cancelled', () => {
        const cancelledRca = { ...completeRca, status: 'STATUS-CANCELLED' };
        const actions: any[] = [];
        const result = calculateRcaStatus(cancelledRca as any, actions, mockTaxonomy);

        expect(result.newStatus).toBe('STATUS-CANCELLED');
        expect(result.statusChanged).toBe(false);
        expect(result.reason).toContain('protected');
    });

    it('should auto-set completion_date when transitioning to Concluded', () => {
        const rcaWithoutCompletionDate = { ...completeRca, status: 'STATUS-01', completion_date: undefined };
        const actions: any[] = [];
        const result = calculateRcaStatus(rcaWithoutCompletionDate as any, actions, mockTaxonomy);

        expect(result.newStatus).toBe('STATUS-03');
        expect(result.completionDate).toBeDefined();
        expect(result.completionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should NOT set completion_date if already exists', () => {
        const rcaWithDate = { ...completeRca, status: 'STATUS-01', completion_date: '2024-01-01' };
        const actions: any[] = [];
        const result = calculateRcaStatus(rcaWithDate as any, actions, mockTaxonomy);

        expect(result.completionDate).toBeUndefined();
    });

    it('should only consider actions for the specific RCA', () => {
        const actions = [
            { id: 'A1', rca_id: 'RCA-001', status: '1', action: 'Pending for this RCA', responsible: 'John', date: '2024-01-01' },
            { id: 'A2', rca_id: 'OTHER-RCA', status: '1', action: 'Pending for other RCA', responsible: 'John', date: '2024-01-01' }
        ];
        const result = calculateRcaStatus(completeRca as any, actions, mockTaxonomy);

        // Only 1 pending action for RCA-001
        expect(result.newStatus).toBe('STATUS-WAITING');
        expect(result.reason).toContain('1 action(s) pending');
    });
});

// ============================================================================
// DATA MIGRATION TESTS
// ============================================================================

describe('migrateRcaData', () => {
    it('should convert string participants to array', () => {
        const legacyRca = { participants: 'Alice, Bob, Charlie' };
        const migrated = migrateRcaData(legacyRca);

        expect(Array.isArray(migrated.participants)).toBe(true);
        expect(migrated.participants).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should handle participants with extra spaces', () => {
        const legacyRca = { participants: '  Alice  ,  Bob  ' };
        const migrated = migrateRcaData(legacyRca);

        expect(migrated.participants).toEqual(['Alice', 'Bob']);
    });

    it('should initialize empty root_causes array if missing', () => {
        const legacyRca = {};
        const migrated = migrateRcaData(legacyRca);

        expect(migrated.root_causes).toEqual([]);
    });

    it('should initialize five_whys with 5 empty entries if missing', () => {
        const legacyRca = {};
        const migrated = migrateRcaData(legacyRca);

        expect(migrated.five_whys).toHaveLength(5);
        expect(migrated.five_whys[0]).toHaveProperty('id', '1');
    });

    it('should initialize ishikawa structure if missing', () => {
        const legacyRca = {};
        const migrated = migrateRcaData(legacyRca);

        expect(migrated.ishikawa).toHaveProperty('machine');
        expect(migrated.ishikawa).toHaveProperty('method');
        expect(migrated.ishikawa).toHaveProperty('material');
    });

    it('should preserve existing data when migrating', () => {
        const existingRca = {
            id: 'RCA-001',
            what: 'Existing Title',
            participants: ['Alice'],
            root_causes: [{ id: 'RC-1', cause: 'Test' }]
        };
        const migrated = migrateRcaData(existingRca);

        expect(migrated.id).toBe('RCA-001');
        expect(migrated.what).toBe('Existing Title');
        expect(migrated.participants).toEqual(['Alice']);
        expect(migrated.root_causes).toHaveLength(1);
    });
});
