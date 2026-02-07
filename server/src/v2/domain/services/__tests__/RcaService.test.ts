import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RcaService } from '../RcaService';
import { SqlRcaRepository } from '../../../infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../../../infrastructure/repositories/SqlActionRepository';
import { TaxonomyConfig } from '../../../domain/types/RcaTypes';

describe('RcaService', () => {
    let service: RcaService;
    let rcaRepoMock: any;
    let actionRepoMock: any;

    const mockTaxonomy: TaxonomyConfig = {
        analysisStatuses: [
            { id: 'STATUS-01', name: 'Em Andamento' },
            { id: 'STATUS-02', name: 'Aguardando Verificação' },
            { id: 'STATUS-03', name: 'Concluída' }
        ],
        mandatoryFields: {
            rca: {
                create: [], 
                conclude: ['what', 'root_causes']
            }
        },
        analysisTypes: [], specialties: [], failureModes: [], failureCategories: [],
        componentTypes: [], rootCauseMs: [], triggerStatuses: []
    };

    beforeEach(() => {
        // Reset mandatory fields to avoid test pollution
        mockTaxonomy.mandatoryFields.rca.conclude = ['what', 'root_causes'];
        
        // Create manual mocks
        rcaRepoMock = {
            create: vi.fn(),
            update: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn()
        };

        actionRepoMock = {
            findByRcaId: vi.fn().mockReturnValue([])
        };

        // Inject mocks
        service = new RcaService(
            rcaRepoMock as unknown as SqlRcaRepository,
            actionRepoMock as unknown as SqlActionRepository
        );
    });

    describe('migrateRcaData', () => {
        it('should normalize participants from string to array', () => {
            const result = service.migrateRcaData({ participants: 'John, Doe' });
            expect(result.participants).toEqual(['John', 'Doe']);
        });

        it('should ensure root_causes array', () => {
            const result = service.migrateRcaData({});
            expect(Array.isArray(result.root_causes)).toBe(true);
        });
    });

    describe('calculateRcaStatus', () => {
        it('should remain In Progress if mandatory fields missing', () => {
            const rca: any = { status: 'STATUS-01', what: '' }; // Missing 'what' (if mandatory)
            // Need to update taxonomy for this test to match expectation
            const taxonomy = { ...mockTaxonomy };
            taxonomy.mandatoryFields!.rca.conclude = ['what']; // Make 'what' mandatory

            const result = service.calculateRcaStatus(rca, [], taxonomy);

            expect(result.newStatus).toBe('STATUS-01');
            expect(result.reason).toContain('Missing');
        });

        it('should move to Concluded if complete and no actions', () => {
            const rca: any = {
                status: 'STATUS-01',
                what: 'Filled',
                root_causes: ['Cause']
            };
            const result = service.calculateRcaStatus(rca, [], mockTaxonomy);

            expect(result.newStatus).toBe('STATUS-03');
            expect(result.statusChanged).toBe(true);
        });

        it('should move to Waiting if actions pending', () => {
            const rca: any = {
                id: '1',
                status: 'STATUS-01',
                what: 'Filled',
                root_causes: ['Cause 1']
            };
            // Pending action
            const actions: any[] = [{ rca_id: '1', status: '1' }];

            const result = service.calculateRcaStatus(rca, actions, mockTaxonomy);

            expect(result.newStatus).toBe('STATUS-02');
        });
    });

    describe('createRca', () => {
        it('should call repository create', () => {
            const result = service.createRca({ what: 'New', root_causes: ['Cause'] }, mockTaxonomy);

            expect(rcaRepoMock.create).toHaveBeenCalled();
            expect(result.rca.status).toBe('STATUS-03'); 
        });

        it('should verify STATUS-01 when mandatory fields missing', () => {
            // 'root_causes' is mandatory for conclude.
            // We pass { what: 'New' }. root_causes migrated to [].
            // validateMandatory -> root_causes valid? NO (length 0).
            // So status -> STATUS-01.

            const result = service.createRca({ what: 'New' }, mockTaxonomy);
            expect(result.rca.status).toBe('STATUS-01');
        });
    });
});
