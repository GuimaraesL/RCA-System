import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { ActionService } from '../ActionService';
import { SqlActionRepository } from '../../../infrastructure/repositories/SqlActionRepository';
import { SqlRcaRepository } from '../../../infrastructure/repositories/SqlRcaRepository';
import { SqlTaxonomyRepository } from '../../../infrastructure/repositories/SqlTaxonomyRepository';
import { SqlTriggerRepository } from '../../../infrastructure/repositories/SqlTriggerRepository';
import { Action, Trigger, TaxonomyConfig } from '../../types/RcaTypes';

// Mocks
vi.mock('../../../infrastructure/repositories/SqlActionRepository');
vi.mock('../../../infrastructure/repositories/SqlRcaRepository');
vi.mock('../../../infrastructure/repositories/SqlTaxonomyRepository');
vi.mock('../../../infrastructure/repositories/SqlTriggerRepository');
vi.mock('../../../infrastructure/logger');

describe('Domain Service: ActionService', () => {
    let actionService: ActionService;
    let actionRepo: Mocked<SqlActionRepository>;
    let rcaRepo: Mocked<SqlRcaRepository>;
    let taxonomyRepo: Mocked<SqlTaxonomyRepository>;
    let triggerRepo: Mocked<SqlTriggerRepository>;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Criar instâncias mockadas corrigindo o erro de argumentos no construtor mockado
        // Repositórios SQL no backend não recebem argumentos no construtor
        actionRepo = new SqlActionRepository() as Mocked<SqlActionRepository>;
        rcaRepo = new SqlRcaRepository() as Mocked<SqlRcaRepository>;
        taxonomyRepo = new SqlTaxonomyRepository() as Mocked<SqlTaxonomyRepository>;
        triggerRepo = new SqlTriggerRepository() as Mocked<SqlTriggerRepository>;

        // Configurar retornos padrão para evitar TypeError nas chamadas internas do RcaService
        actionRepo.findByRcaId.mockReturnValue([]);
        rcaRepo.findById.mockReturnValue(null);
        triggerRepo.findByRcaId.mockReturnValue(null);

        actionService = new ActionService(actionRepo, rcaRepo, taxonomyRepo);
        
        // Configurar mocks do rcaService interno (que é privado e criado no construtor)
        (actionService as any).rcaService.rcaRepo = rcaRepo;
        (actionService as any).rcaService.actionRepo = actionRepo;
        (actionService as any).rcaService.triggerRepo = triggerRepo;
        
        const mockTaxonomy: TaxonomyConfig = {
            analysisStatuses: [],
            analysisTypes: [],
            specialties: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCauseMs: [],
            triggerStatuses: [],
            mandatoryFields: {
                trigger: { save: [] },
                rca: { create: [], conclude: [] }
            }
        };

        taxonomyRepo.getTaxonomy.mockReturnValue(mockTaxonomy);
    });

    describe('CRUD Operations', () => {
        it('should fetch actions by RCA ID', () => {
            const mockActions: Action[] = [{ id: 'A1', rca_id: 'R1' } as any];
            actionRepo.findByRcaId.mockReturnValue(mockActions);

            const result = actionService.getByRcaId('R1');

            expect(result).toEqual(mockActions);
            expect(actionRepo.findByRcaId).toHaveBeenCalledWith('R1');
        });

        it('should create an action and trigger RCA status recalculation', () => {
            const newAction: Action = { id: 'A1', rca_id: 'R1' } as any;
            const mockRca = { id: 'R1' };
            rcaRepo.findById.mockReturnValue(mockRca as any);

            actionService.createAction(newAction);

            expect(actionRepo.create).toHaveBeenCalledWith(newAction);
            expect(rcaRepo.findById).toHaveBeenCalledWith('R1');
        });

        it('should update an existing action and trigger recalculation', () => {
            const existingAction: Action = { id: 'A1', rca_id: 'R1', action: 'Old' } as any;
            const updateData = { action: 'New' };
            actionRepo.findById.mockReturnValue(existingAction);
            rcaRepo.findById.mockReturnValue({ id: 'R1' } as any);

            actionService.updateAction('A1', updateData);

            expect(actionRepo.update).toHaveBeenCalledWith(expect.objectContaining({
                id: 'A1',
                action: 'New'
            }));
            expect(rcaRepo.findById).toHaveBeenCalledWith('R1');
        });

        it('should throw error when updating non-existent action', () => {
            actionRepo.findById.mockReturnValue(null);

            expect(() => actionService.updateAction('INVALID', {})).toThrow('Ação não encontrada');
        });

        it('should delete an action and trigger recalculation', () => {
            const existingAction: Action = { id: 'A1', rca_id: 'R1' } as any;
            actionRepo.findById.mockReturnValue(existingAction);
            rcaRepo.findById.mockReturnValue({ id: 'R1' } as any);

            actionService.deleteAction('A1');

            expect(actionRepo.delete).toHaveBeenCalledWith('A1');
            expect(rcaRepo.findById).toHaveBeenCalledWith('R1');
        });

        it('should return silently when deleting non-existent action', () => {
            actionRepo.findById.mockReturnValue(null);

            actionService.deleteAction('INVALID');

            expect(actionRepo.delete).not.toHaveBeenCalled();
        });

        it('should fetch an action by its ID', () => {
            const mockAction: Action = { id: 'A1' } as any;
            actionRepo.findById.mockReturnValue(mockAction);

            const result = actionService.getById('A1');

            expect(result).toEqual(mockAction);
            expect(actionRepo.findById).toHaveBeenCalledWith('A1');
        });
    });

    describe('Bulk Operations', () => {
        it('should perform bulk delete', () => {
            const ids = ['A1', 'A2'];
            actionService.bulkDelete(ids);
            expect(actionRepo.bulkDelete).toHaveBeenCalledWith(ids);
        });

        it('should bulk import actions and recalculate affected RCAs', () => {
            const actions: Action[] = [
                { id: 'A1', rca_id: 'R1' } as any,
                { id: 'A2', rca_id: 'R1' } as any,
                { id: 'A3', rca_id: 'R2' } as any
            ];
            rcaRepo.findById.mockImplementation((id) => ({ id } as any));

            actionService.bulkImport(actions);

            expect(actionRepo.bulkCreate).toHaveBeenCalledWith(actions);
            // Deve chamar o recálculo uma vez para R1 e uma vez para R2
            expect(rcaRepo.findById).toHaveBeenCalledWith('R1');
            expect(rcaRepo.findById).toHaveBeenCalledWith('R2');
            expect(rcaRepo.findById).toHaveBeenCalledTimes(2);
        });

        it('should handle errors during bulk import recalculation gracefully', () => {
            const actions: Action[] = [{ id: 'A1', rca_id: 'R1' } as any];
            rcaRepo.findById.mockImplementation(() => {
                throw new Error('Recalculation Failed');
            });

            // Não deve lançar exceção
            expect(() => actionService.bulkImport(actions)).not.toThrow();
        });
    });

    describe('Status Recalculation Trigger', () => {
        it('should not trigger recalculation if RCA is not found', () => {
            const action: Action = { id: 'A1', rca_id: 'NON_EXISTENT' } as any;
            rcaRepo.findById.mockReturnValue(null);

            actionService.createAction(action);

            expect(taxonomyRepo.getTaxonomy).toHaveBeenCalled();
            expect(rcaRepo.findById).toHaveBeenCalledWith('NON_EXISTENT');
            // rcaService.updateRca não é chamado se rca for null
        });
    });
});
