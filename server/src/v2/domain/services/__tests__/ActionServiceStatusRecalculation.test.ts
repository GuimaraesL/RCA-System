/**
 * Teste: ActionServiceStatusRecalculation.test.ts
 * 
 * Proposta: Validar o disparo automático de recálculo de status da RCA após operações em massa no plano de ação.
 * Ações: Simulação de importação em massa (bulkImport) de ações e verificação se o serviço de RCA é notificado para atualizar o status das análises afetadas.
 * Execução: Backend Vitest.
 * Fluxo: Mock de repositórios -> Configuração de RCA de teste -> Execução de bulkImport de ações vinculadas -> Verificação de chamada ao método updateRca do RcaService.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionService } from '../ActionService';
import { SqlActionRepository } from '../../../infrastructure/repositories/SqlActionRepository';
import { SqlRcaRepository } from '../../../infrastructure/repositories/SqlRcaRepository';
import { SqlTaxonomyRepository } from '../../../infrastructure/repositories/SqlTaxonomyRepository';
import { RcaService } from '../RcaService';

// Mock de repositórios
vi.mock('../../../infrastructure/repositories/SqlActionRepository');
vi.mock('../../../infrastructure/repositories/SqlRcaRepository');
vi.mock('../../../infrastructure/repositories/SqlTaxonomyRepository');

describe('ActionService - Recálculo de Status', () => {
    let actionService: ActionService;
    let mockActionRepo: any;
    let mockRcaRepo: any;
    let mockTaxonomyRepo: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockActionRepo = new SqlActionRepository();
        mockRcaRepo = new SqlRcaRepository();
        mockTaxonomyRepo = new SqlTaxonomyRepository();
        
        // Configuração inicial da taxonomia
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

