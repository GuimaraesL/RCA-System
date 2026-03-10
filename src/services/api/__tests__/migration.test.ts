import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importDataToApi } from '../migration';
import * as base from '../base';
import * as assets from '../assets';
import * as taxonomy from '../taxonomy';
import * as rcas from '../rcas';
import * as actions from '../actions';
import * as triggers from '../triggers';
import { RcaRecord, ActionRecord, TriggerRecord, TaxonomyConfig } from '../../../types';
import { STATUS_IDS } from '../../../constants/SystemConstants';

// Mocks
vi.mock('../base', async () => {
    const actual = await vi.importActual('../base') as any;
    return {
        ...actual,
        checkResponse: vi.fn().mockResolvedValue(undefined)
    };
});

vi.mock('../assets', () => ({
    importAssetsToApi: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../taxonomy', () => ({
    fetchTaxonomy: vi.fn().mockResolvedValue({
        analysisTypes: [],
        analysisStatuses: [],
        specialties: [],
        failureModes: [],
        failureCategories: [],
        componentTypes: [],
        rootCauseMs: [],
        triggerStatuses: []
    }),
    saveTaxonomyToApi: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../rcas', () => ({
    fetchRecords: vi.fn().mockResolvedValue([])
}));

vi.mock('../actions', () => ({
    fetchActions: vi.fn().mockResolvedValue([])
}));

vi.mock('../triggers', () => ({
    fetchTriggers: vi.fn().mockResolvedValue([])
}));

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Service: Migration (importDataToApi)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({}),
            text: async () => JSON.stringify({})
        });
    });

    it('should successfully import complete data in REPLACE mode and cleanup existing data', async () => {
        // Arrange
        (rcas.fetchRecords as any).mockResolvedValue([{ id: 'OLD_R1' }]);
        (actions.fetchActions as any).mockResolvedValue([{ id: 'OLD_A1' }]);
        (triggers.fetchTriggers as any).mockResolvedValue([{ id: 'OLD_T1' }]);

        const data = {
            records: [{ id: 'R1', what: 'RCA 1', status: STATUS_IDS.IN_PROGRESS }] as RcaRecord[],
            actions: [{ id: 'A1', rca_id: 'R1', status: '1' }] as ActionRecord[]
        };

        // Act
        const result = await importDataToApi(data, 'REPLACE');

        // Assert
        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/rcas/bulk-delete'), expect.any(Object));
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/actions/bulk-delete'), expect.any(Object));
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/triggers/bulk-delete'), expect.any(Object));
    });

    it('should use taxonomy filters when provided', async () => {
        // Arrange
        const data = {
            taxonomy: { 
                analysisTypes: [{ id: 'T1', name: 'New Type' }],
                failureModes: [{ id: 'F1', name: 'New Mode' }]
            } as any
        };

        // Act
        await importDataToApi(data, 'UPDATE', ['analysisTypes']);

        // Assert
        expect(taxonomy.saveTaxonomyToApi).toHaveBeenCalledWith(expect.objectContaining({
            analysisTypes: expect.arrayContaining([expect.objectContaining({ name: 'New Type' })]),
            // failureModes should NOT be updated because it's not in filters
            failureModes: []
        }));
    });

    it('should handle participants and root causes as JSON strings', async () => {
        // Arrange
        const data = {
            records: [{ 
                id: 'R1', 
                participants: '["P1", "P2"]',
                root_causes: '[{"description": "RC1", "root_cause_m_id": "M1"}]',
                downtime_minutes: 10,
                // Missing other mandatory fields to keep it IN_PROGRESS or check completion logic
            }] as any[]
        };

        // Act
        await importDataToApi(data, 'UPDATE');

        // Assert
        const rcaCall = mockFetch.mock.calls.find(call => call[0].includes('/rcas/bulk'));
        const rcaPayload = JSON.parse(rcaCall[1].body);
        expect(rcaPayload.records[0].participants).toBe('["P1", "P2"]');
    });

    it('should generate IDs for items without IDs in APPEND mode', async () => {
        // Arrange
        const data = {
            records: [{ what: 'RCA without ID' }] as any[],
            actions: [{ action: 'ACT without ID', rca_id: 'SOME_RCA' }] as any[]
        };

        // Act
        await importDataToApi(data, 'APPEND');

        // Assert
        const rcaCall = mockFetch.mock.calls.find(call => call[0].includes('/rcas/bulk'));
        const rcaPayload = JSON.parse(rcaCall[1].body);
        expect(rcaPayload.records[0].id).toMatch(/^RCA-/);
        expect(rcaPayload.actions[0].id).toMatch(/^ACT-/);
    });

    it('should handle complex taxonomy normalization including root causes', async () => {
        // Arrange
        const data = {
            records: [{ 
                id: 'R1',
                specialty_id: 'Spec New',
                failure_mode_id: 'Mode New',
                failure_category_id: 'Cat New',
                component_type: 'Comp New',
                root_causes: [{ description: 'Cause 1', root_cause_m_id: 'M New' }]
            }] as any[]
        };

        // Act
        await importDataToApi(data, 'UPDATE');

        // Assert
        expect(taxonomy.saveTaxonomyToApi).toHaveBeenCalled();
        const finalTaxonomy = (taxonomy.saveTaxonomyToApi as any).mock.calls[0][0];
        expect(finalTaxonomy.specialties).toContainEqual(expect.objectContaining({ name: 'Spec New' }));
        expect(finalTaxonomy.rootCauseMs).toContainEqual(expect.objectContaining({ name: 'M New' }));
    });

    it('should handle incomplete payloads by extracting assets from records', async () => {
        // Arrange
        const data = {
            records: [{ 
                id: 'R1', 
                what: 'RCA 1', 
                area_id: 'AREA_1',
                equipment_id: 'EQ_1',
                subgroup_id: 'SUB_1'
            }] as RcaRecord[]
        };

        // Act
        const result = await importDataToApi(data, 'APPEND');

        // Assert
        expect(result.success).toBe(true);
        expect(assets.importAssetsToApi).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ id: 'AREA_1', type: 'AREA' }),
            expect.objectContaining({ id: 'EQ_1', type: 'EQUIPMENT', parentId: 'AREA_1' }),
            expect.objectContaining({ id: 'SUB_1', type: 'SUBGROUP', parentId: 'EQ_1' })
        ]));
    });

    it('should generate new IDs in APPEND mode to avoid conflicts', async () => {
        // Arrange
        const data = {
            records: [{ id: 'OLD_RCA_1', what: 'RCA 1' }] as RcaRecord[],
            actions: [{ id: 'OLD_ACT_1', rca_id: 'OLD_RCA_1' }] as ActionRecord[]
        };

        // Act
        const result = await importDataToApi(data, 'APPEND');

        // Assert
        expect(result.success).toBe(true);
        const rcaCall = mockFetch.mock.calls.find(call => call[0].includes('/rcas/bulk'));
        const rcaPayload = JSON.parse(rcaCall[1].body);
        const newRcaId = rcaPayload.records[0].id;
        
        expect(newRcaId).not.toBe('OLD_RCA_1');
        expect(rcaPayload.actions[0].rca_id).toBe(newRcaId);
        expect(rcaPayload.actions[0].id).not.toBe('OLD_ACT_1');
    });

    it('should normalize taxonomy and status during import', async () => {
        // Arrange
        const data = {
            records: [{ 
                id: 'R1', 
                status: 'Em Andamento', 
                analysis_type: 'Tipo Novo' 
            }] as any[]
        };
        (taxonomy.fetchTaxonomy as any).mockResolvedValue({
            analysisStatuses: [{ id: STATUS_IDS.IN_PROGRESS, name: 'In Progress' }],
            analysisTypes: []
        });

        // Act
        await importDataToApi(data, 'UPDATE');

        // Assert
        const rcaCall = mockFetch.mock.calls.find(call => call[0].includes('/rcas/bulk'));
        const rcaPayload = JSON.parse(rcaCall[1].body);
        
        // 'Em Andamento' should map to IN_PROGRESS based on ensureTaxonomy logic
        expect(rcaPayload.records[0].status).toBe(STATUS_IDS.IN_PROGRESS);
        // 'Tipo Novo' should be added to taxonomy
        expect(taxonomy.saveTaxonomyToApi).toHaveBeenCalledWith(expect.objectContaining({
            analysisTypes: expect.arrayContaining([expect.objectContaining({ name: 'Tipo Novo' })])
        }));
    });

    it('should return error result when a network failure occurs', async () => {
        // Arrange
        const data = {
            records: [{ id: 'R1', what: 'RCA 1' }] as RcaRecord[]
        };
        mockFetch.mockRejectedValue(new Error('Network Timeout'));

        // Act
        const result = await importDataToApi(data, 'REPLACE');

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Network Timeout');
    });

    it('should handle corrupted or missing record fields gracefully', async () => {
        // Arrange
        const data = {
            records: [{ id: 'R1' }] as any[] // Missing almost everything
        };

        // Act
        const result = await importDataToApi(data, 'UPDATE');

        // Assert
        expect(result.success).toBe(true);
        const rcaCall = mockFetch.mock.calls.find(call => call[0].includes('/rcas/bulk'));
        const rcaPayload = JSON.parse(rcaCall[1].body);
        
        // Should default to IN_PROGRESS if mandatory fields are missing
        expect(rcaPayload.records[0].status).toBe(STATUS_IDS.IN_PROGRESS);
    });

    it('should transition status to CONCLUDED if mandatory fields are complete and no actions exist', async () => {
        // Arrange
        const data = {
            records: [{ 
                id: 'R1', 
                status: STATUS_IDS.IN_PROGRESS,
                analysis_type: 'T1',
                what: 'W',
                problem_description: 'D',
                subgroup_id: 'S1',
                who: 'U',
                when: '2023-01-01',
                where_description: 'Loc',
                specialty_id: 'SP1',
                failure_mode_id: 'FM1',
                failure_category_id: 'FC1',
                component_type: 'CT1',
                participants: ['P1'],
                root_causes: ['RC1'],
                downtime_minutes: 60
            }] as any[]
        };

        // Act
        await importDataToApi(data, 'UPDATE');

        // Assert
        const rcaCall = mockFetch.mock.calls.find(call => call[0].includes('/rcas/bulk'));
        const rcaPayload = JSON.parse(rcaCall[1].body);
        expect(rcaPayload.records[0].status).toBe(STATUS_IDS.CONCLUDED);
    });
});
