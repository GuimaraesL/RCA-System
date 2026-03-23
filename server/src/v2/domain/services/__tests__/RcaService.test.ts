/**
 * Teste: RcaService.test.ts
 * 
 * Proposta: Validar as regras de negócio core do sistema de análise de causa raiz (RCA).
 * Ações: Testes de normalização de dados, migração de formatos legados e lógica de transição automática de status.
 * Execução: Backend Vitest.
 * Fluxo: Mock de repositórios -> Execução de métodos de serviço -> Verificação de transformações de dados -> Validação de regras de status.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RcaService } from '../RcaService';
import { SqlRcaRepository } from '../../../infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../../../infrastructure/repositories/SqlActionRepository';
import { SqlTriggerRepository } from '../../../infrastructure/repositories/SqlTriggerRepository';
import { SqlAssetRepository } from '../../../infrastructure/repositories/SqlAssetRepository';
import { TaxonomyConfig } from '../../../domain/types/RcaTypes';

describe('RcaService', () => {
    let service: RcaService;
    let rcaRepoMock: any;
    let actionRepoMock: any;
    let triggerRepoMock: any;
    let assetRepoMock: any;

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
        // Reseta campos obrigatórios para evitar poluição entre testes
        mockTaxonomy.mandatoryFields.rca.conclude = ['what', 'root_causes'];
        
        // Criação de mocks manuais
        rcaRepoMock = {
            create: vi.fn(),
            update: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(),
            bulkCreate: vi.fn()
        };

        actionRepoMock = {
            findByRcaId: vi.fn().mockReturnValue([])
        };

        triggerRepoMock = {
            findByRcaId: vi.fn().mockReturnValue(null),
            update: vi.fn()
        };
 
        assetRepoMock = {
            bulkCreate: vi.fn()
        };
 
        // Injeta mocks
        service = new RcaService(
            rcaRepoMock as unknown as SqlRcaRepository,
            actionRepoMock as unknown as SqlActionRepository,
            triggerRepoMock as unknown as SqlTriggerRepository,
            assetRepoMock as unknown as SqlAssetRepository
        );
    });

    describe('migrateRcaData', () => {
        it('deve normalizar participantes de string para array', () => {
            const result = service.migrateRcaData({ participants: 'John, Doe' });
            expect(result.participants).toEqual(['John', 'Doe']);
        });

        it('deve garantir que root_causes seja um array', () => {
            const result = service.migrateRcaData({});
            expect(Array.isArray(result.root_causes)).toBe(true);
        });
    });

    describe('calculateRcaStatus', () => {
        it('deve permanecer Em Andamento se campos obrigatórios estiverem ausentes', () => {
            const rca: any = { status: 'STATUS-01', what: '' }; // 'what' vazio
            const taxonomy = { ...mockTaxonomy };
            taxonomy.mandatoryFields!.rca.conclude = ['what']; 

            const result = service.calculateRcaStatus(rca, [], taxonomy);

            expect(result.newStatus).toBe('STATUS-01');
            expect(result.reason).toContain('Campos ausentes');
        });

        it('deve mudar para Concluída se estiver completo e sem ações', () => {
            const rca: any = {
                status: 'STATUS-01',
                what: 'Filled',
                participants: ['User'],
                root_causes: [{ id: '1', root_cause_m_id: 'M1', cause: 'Technical' }],
                five_whys: [
                    { id: '1', answer: 'A' },
                    { id: '2', answer: 'B' },
                    { id: '3', answer: 'C' }
                ]
            };
            // Ensure all required fields are mocked as filled
            mockTaxonomy.mandatoryFields.rca.conclude = ['what', 'root_causes', 'participants', 'five_whys'];
            
            const result = service.calculateRcaStatus(rca, [], mockTaxonomy);

            expect(result.newStatus).toBe('STATUS-03');
            expect(result.statusChanged).toBe(true);
        });

        it('deve mudar para Aguardando se houver ações pendentes', () => {
            const rca: any = {
                id: '1',
                status: 'STATUS-01',
                what: 'Filled',
                participants: ['User'],
                root_causes: [{ id: '1', root_cause_m_id: 'M1', cause: 'Technical' }],
                five_whys: [{ id: '1', answer: 'A' }, { id: '2', answer: 'B' }, { id: '3', answer: 'C' }]
            };
            // NECESSÁRIO: Incluir 'actions' nos obrigatórios para disparar STATUS-02
            mockTaxonomy.mandatoryFields.rca.conclude = ['what', 'root_causes', 'participants', 'five_whys', 'actions'];
            
            // Ação pendente
            const actions: any[] = [{ rca_id: '1', status: '1' }];

            const result = service.calculateRcaStatus(rca, actions, mockTaxonomy);

            expect(result.newStatus).toBe('STATUS-02');
        });
    });

    describe('createRca', () => {
        it('deve chamar o método create do repositório', () => {
            const rcaData = { 
                what: 'New', 
                participants: ['User'],
                root_causes: [{ id: '1', root_cause_m_id: 'M1', cause: 'Technical' }],
                five_whys: [{ id: '1', answer: 'A' }, { id: '2', answer: 'B' }, { id: '3', answer: 'C' }]
            };
            mockTaxonomy.mandatoryFields.rca.conclude = ['what', 'root_causes'];
            
            const result = service.createRca(rcaData, mockTaxonomy);

            expect(rcaRepoMock.create).toHaveBeenCalled();
            expect(result.rca.status).toBe('STATUS-03'); 
        });

        it('deve verificar STATUS-01 quando campos obrigatórios estão faltando', () => {
            const result = service.createRca({ what: 'New' }, mockTaxonomy);
            expect(result.rca.status).toBe('STATUS-01');
        });
    });

    describe('bulkImport', () => {
        it('deve sincronizar ativos únicos encontrados nas RCAs', () => {
            const data = [
                { id: '1', area_id: 'AREA1', equipment_id: 'EQ1', subgroup_id: 'SUB1' },
                { id: '2', area_id: 'AREA1', equipment_id: 'EQ1', subgroup_id: 'SUB2' }
            ];

            service.bulkImport(data, mockTaxonomy);

            expect(assetRepoMock.bulkCreate).toHaveBeenCalled();
            const calledWith = assetRepoMock.bulkCreate.mock.calls[0][0];
            
            // Deve ter 4 ativos únicos: AREA1, EQ1, SUB1, SUB2
            expect(calledWith.length).toBe(4);
            expect(calledWith.find((a: any) => a.id === 'AREA1')).toBeDefined();
            expect(calledWith.find((a: any) => a.id === 'EQ1')?.parent_id).toBe('AREA1');
            expect(calledWith.find((a: any) => a.id === 'SUB2')?.parent_id).toBe('EQ1');
        });
    });
});
