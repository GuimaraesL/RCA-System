
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionService } from '../ActionService';
import { SqlActionRepository } from '../../../infrastructure/repositories/SqlActionRepository';
import { SqlRcaRepository } from '../../../infrastructure/repositories/SqlRcaRepository';
import { SqlTaxonomyRepository } from '../../../infrastructure/repositories/SqlTaxonomyRepository';
import { RcaService } from '../RcaService';

// Mock repositories
vi.mock('../../../infrastructure/repositories/SqlActionRepository');
vi.mock('../../../infrastructure/repositories/SqlRcaRepository');
vi.mock('../../../infrastructure/repositories/SqlTaxonomyRepository');

describe('ActionService Status Recalculation', () => {
    let actionService: ActionService;
    let mockActionRepo: any;
    let mockRcaRepo: any;
    let mockTaxonomyRepo: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockActionRepo = new SqlActionRepository();
        mockRcaRepo = new SqlRcaRepository();
        mockTaxonomyRepo = new SqlTaxonomyRepository();
        
        // Setup initial taxonomy
        mockTaxonomyRepo.getTaxonomy.mockReturnValue({
            analysisStatuses: [
                { id: 'STATUS-01', name: 'Em Andamento' },
                { id: 'STATUS-02', name: 'Aguardando Verificação' },
                { id: 'STATUS-03', name: 'Concluída' }
            ],
            mandatoryFields: {
                rca: { conclude: ['actions'] }
            }
        });

        actionService = new ActionService(mockActionRepo, mockRcaRepo, mockTaxonomyRepo);
    });

    it('deve disparar recálculo de status para as RCAs afetadas após bulkImport', () => {
        const rcaId = 'RCA-1';
        const actions = [
            { id: 'ACT-1', rca_id: rcaId, action: 'Ação 1', status: '3' },
            { id: 'ACT-2', rca_id: rcaId, action: 'Ação 2', status: '3' }
        ] as any;

        const mockRca = {
            id: rcaId,
            status: 'STATUS-02',
            what: 'O que',
            // ... outros campos obrigatórios seriam necessários para o motor real,
            // mas aqui o motor vai rodar via RcaService.updateRca
        };

        mockRcaRepo.findById.mockReturnValue(mockRca);
        // Simula que ao buscar ações para essa RCA, retorna as novas
        mockActionRepo.findByRcaId.mockReturnValue(actions);

        // Espiona o método updateRca do rcaService interno
        const updateRcaSpy = vi.spyOn(actionService['rcaService'], 'updateRca');

        actionService.bulkImport(actions);

        expect(mockActionRepo.bulkCreate).toHaveBeenCalledWith(actions);
        expect(updateRcaSpy).toHaveBeenCalledWith(rcaId, expect.anything(), expect.anything());
    });
});
