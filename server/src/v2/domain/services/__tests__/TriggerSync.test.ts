/**
 * Teste: TriggerSync.test.ts
 * 
 * Proposta: Validar a sincronização automática de status entre RCA e Trigger (Issue #77).
 * Ações: Criar/Atualizar RCA e verificar se o Trigger vinculado reflete a mudança de status.
 * Execução: Backend Vitest.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RcaService } from '../RcaService';
import { SqlRcaRepository } from '../../../infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../../../infrastructure/repositories/SqlActionRepository';
import { SqlTriggerRepository } from '../../../infrastructure/repositories/SqlTriggerRepository';
import { TaxonomyConfig } from '../../../domain/types/RcaTypes';
import { STATUS_IDS, TRIGGER_STATUS_IDS } from '../../constants';

describe('RcaService - Sincronização de Trigger', () => {
    let service: RcaService;
    let rcaRepoMock: any;
    let actionRepoMock: any;
    let triggerRepoMock: any;

    const mockTaxonomy: TaxonomyConfig = {
        analysisStatuses: [
            { id: STATUS_IDS.IN_PROGRESS, name: 'Em Andamento' },
            { id: STATUS_IDS.CONCLUDED, name: 'Concluída' }
        ],
        mandatoryFields: {
            rca: {
                create: [], 
                conclude: ['what']
            }
        },
        analysisTypes: [], specialties: [], failureModes: [], failureCategories: [],
        componentTypes: [], rootCauseMs: [], 
        triggerStatuses: [
            { id: TRIGGER_STATUS_IDS.NEW, name: 'Novo' },
            { id: TRIGGER_STATUS_IDS.IN_ANALYSIS, name: 'Em Análise' },
            { id: TRIGGER_STATUS_IDS.ARCHIVED, name: 'Arquivado' }
        ]
    };

    beforeEach(() => {
        rcaRepoMock = {
            create: vi.fn(),
            update: vi.fn(),
            findById: vi.fn()
        };

        actionRepoMock = {
            findByRcaId: vi.fn().mockReturnValue([])
        };

        triggerRepoMock = {
            findByRcaId: vi.fn(),
            update: vi.fn()
        };

        service = new RcaService(
            rcaRepoMock as unknown as SqlRcaRepository,
            actionRepoMock as unknown as SqlActionRepository,
            triggerRepoMock as unknown as SqlTriggerRepository
        );
    });

    it('deve atualizar Trigger para "Em Análise" quando RCA é criada (In Progress)', () => {
        // RCA fica em STATUS-01 (Em Andamento) porque 'what' (obrigatório para conclusão) está vazio
        const rcaData = { id: 'rca-1', what: '', status: STATUS_IDS.IN_PROGRESS };
        const mockTrigger = { id: 'trig-1', rca_id: 'rca-1', status: TRIGGER_STATUS_IDS.NEW };
        
        triggerRepoMock.findByRcaId.mockReturnValue(mockTrigger);

        service.createRca(rcaData, mockTaxonomy);

        expect(triggerRepoMock.update).toHaveBeenCalledWith(expect.objectContaining({
            id: 'trig-1',
            status: TRIGGER_STATUS_IDS.IN_ANALYSIS
        }));
    });

    it('deve atualizar Trigger para "Arquivado" quando RCA é atualizada para "Concluída"', () => {
        const rcaData = { id: 'rca-1', what: 'Fixed', status: STATUS_IDS.CONCLUDED };
        const mockTrigger = { id: 'trig-1', rca_id: 'rca-1', status: TRIGGER_STATUS_IDS.IN_ANALYSIS };
        
        triggerRepoMock.findByRcaId.mockReturnValue(mockTrigger);

        service.updateRca('rca-1', rcaData, mockTaxonomy);

        expect(triggerRepoMock.update).toHaveBeenCalledWith(expect.objectContaining({
            id: 'trig-1',
            status: TRIGGER_STATUS_IDS.ARCHIVED
        }));
    });

    it('não deve disparar atualização se o status do Trigger já estiver correto', () => {
        const rcaData = { id: 'rca-1', what: 'Fixed', status: STATUS_IDS.CONCLUDED };
        const mockTrigger = { id: 'trig-1', rca_id: 'rca-1', status: TRIGGER_STATUS_IDS.ARCHIVED };
        
        triggerRepoMock.findByRcaId.mockReturnValue(mockTrigger);

        service.updateRca('rca-1', rcaData, mockTaxonomy);

        expect(triggerRepoMock.update).not.toHaveBeenCalled();
    });
});
