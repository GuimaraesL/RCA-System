/**
 * Teste: csvService.test.ts
 * 
 * Proposta: Validar a lógica de importação e exportação de dados em formato CSV para todas as entidades do sistema.
 * Ações: Testes de geração de templates, detecção de delimitadores, reconstrução de hierarquia de ativos e segurança (CSV Injection).
 * Execução: Frontend Vitest.
 * Fluxo: Chamada de exportação -> Validação de string CSV resultante -> Chamada de importação -> Verificação da integridade do objeto JSON recuperado.
 */

import { describe, it, expect } from 'vitest';
import { importFromCsv, exportToCsv, getCsvTemplate } from '../csvService';
import { AssetNode, TaxonomyConfig, RcaRecord } from '../../types';

describe('csvService', () => {
    const mockTaxonomy: TaxonomyConfig = {
        analysisTypes: [{ id: 'T1', name: 'Falha' }],
        analysisStatuses: [{ id: 'S1', name: 'Aberto' }],
        specialties: [],
        failureModes: [],
        failureCategories: [],
        componentTypes: [],
        rootCauseMs: [],
        triggerStatuses: [{ id: 'TS1', name: 'Novo' }],
        mandatoryFields: {
            rca: { create: [], conclude: [] },
            trigger: { save: [] }
        }
    };

    describe('getCsvTemplate', () => {
        it('deve retornar os templates corretos para cada entidade', () => {
            expect(getCsvTemplate('ASSETS')).toContain('id;name;type;parentId');
            expect(getCsvTemplate('ACTIONS')).toContain('id;rca_id;action');
            expect(getCsvTemplate('TRIGGERS')).toContain('AREA;Equip.;Subconjunto');
        });
    });

    describe('Importação/Exportação Geral', () => {
        it('deve detectar ponto e vírgula corretamente', () => {
            const csv = 'id;name;type\n1;test;AREA';
            const result = importFromCsv('ASSETS', csv, {});
            expect(result.success).toBe(true);
        });

        it('deve detectar vírgula corretamente', () => {
            const csv = 'id,name,type\n1,test,AREA';
            const result = importFromCsv('ASSETS', csv, {});
            expect(result.success).toBe(true);
        });
    });

    describe('Importação/Exportação de ATIVOS', () => {
        it('deve exportar hierarquia de ativos para CSV plano', () => {
            const assets: AssetNode[] = [
                {
                    id: 'A1', name: 'Area 1', type: 'AREA', children: [
                        { id: 'E1', name: 'Equip 1', type: 'EQUIPMENT' }
                    ]
                }
            ];
            const csv = exportToCsv('ASSETS', { assets });
            expect(csv).toContain('A1;Area 1;AREA;');
            expect(csv).toContain('E1;Equip 1;EQUIPMENT;A1');
        });

        it('deve importar ativos planos e reconstruir a hierarquia', () => {
            const csv = 'id;name;type;parentId\nA1;Area 1;AREA;\nE1;Equip 1;EQUIPMENT;A1';
            const result = importFromCsv('ASSETS', csv, {});
            expect(result.success).toBe(true);
            const data = result.data as AssetNode[];
            expect(data.length).toBe(1);
            expect(data[0].id).toBe('A1');
            expect(data[0].children?.length).toBe(1);
            expect(data[0].children?.[0].id).toBe('E1');
        });
    });

    describe('Importação de GATILHOS (TRIGGERS)', () => {
        it('deve importar gatilhos de um CSV estilo Excel', () => {
            const csv = 'AREA;Equip.;Subconjunto;Data/Hora Início;Status\nArea 1;Equip 1;Sub 1;01/01/2023 10:00;Novo';

            const assets: AssetNode[] = [
                {
                    id: 'A1', name: 'Area 1', type: 'AREA', children: [
                        {
                            id: 'E1', name: 'Equip 1', type: 'EQUIPMENT', children: [
                                { id: 'S1', name: 'Sub 1', type: 'SUBGROUP' }
                            ]
                        }
                    ]
                }
            ];

            const result = importFromCsv('TRIGGERS', csv, { assets, taxonomy: mockTaxonomy });
            expect(result.success).toBe(true);
            const data = result.data;
            expect(data.length).toBe(1);
            expect(data[0].area_id).toBe('A1');
            expect(data[0].start_date).toBe('2023-01-01T10:00');
        });

        it('deve herdar hierarquia de uma RCA vinculada se estiver faltando no CSV', () => {
            const records: RcaRecord[] = [{
                id: 'RCA-001',
                area_id: 'A1',
                equipment_id: 'E1',
                subgroup_id: 'S1',
                participants: [],
                status: 'S1',
                failure_date: '2023-01-01'
            } as any];

            const csv = 'AREA;Equip.;Subconjunto;Data/Hora Início;ID AF\n-;-;-;01/01/2023 10:00;RCA-001';

            const result = importFromCsv('TRIGGERS', csv, { records, taxonomy: mockTaxonomy });
            expect(result.success).toBe(true);
            expect(result.data[0].area_id).toBe('A1');
            expect(result.data[0].equipment_id).toBe('E1');
        });

        it('deve lidar com datas seriais do Excel', () => {
            const csv = 'AREA;Equip.;Subconjunto;Data/Hora Início\nArea 1;E1;S1;44927.4166666667';
            const assets: AssetNode[] = [{ id: 'A1', name: 'Area 1', type: 'AREA' }];

            const result = importFromCsv('TRIGGERS', csv, { assets, taxonomy: mockTaxonomy });
            expect(result.success).toBe(true);
            // 44927 é 2023-01-01. 0.41666 é 10:00
            expect(result.data[0].start_date).toContain('2023-01-01T10:00');
        });
    });

    describe('Exportação de RESUMO DE REGISTROS', () => {
        it('deve unir arrays corretamente com pipe durante a exportação', () => {
            const records: RcaRecord[] = [{
                id: 'R1',
                what: 'Test',
                participants: ['User 1', 'User 2'],
                root_causes: [{ cause: 'Cause 1' }, { cause: 'Cause 2' }],
                status: 'S1',
                failure_date: '2023-01-01'
            } as any];

            const csv = exportToCsv('RECORDS_SUMMARY', { records });
            expect(csv).toContain('User 1|User 2');
            expect(csv).toContain(':Cause 1|:Cause 2');
        });
    });

    describe('Importação de TAXONOMIA', () => {
        it('deve lidar com IDs de especialidade para modos de falha', () => {
            const csv = 'id;name;specialty_ids\nFM1;Mode 1;SPEC1|SPEC2';
            const result = importFromCsv('TAXONOMY_FAILURE_MODES', csv, {});
            expect(result.success).toBe(true);
            const items = result.data.failureModes;
            expect(items[0].specialty_ids).toEqual(['SPEC1', 'SPEC2']);
        });
    });

    describe('Segurança e Escapamento', () => {
        it('deve prevenir CSV Injection prefixando com aspas simples', () => {
            const actions = [{ id: '1', action: '=SUM(1+1)', responsible: 'Me' } as any];
            const csv = exportToCsv('ACTIONS', { actions });
            // O serviço prefixa com aspas simples strings que começam com caracteres especiais
            expect(csv).toContain(";'=SUM(1+1)");
        });

        it('deve lidar com campos multilinhas durante o parsing', () => {
            const csv = 'id;rca_id;action;responsible;date;status;moc_number\nA1;R1;"Line 1\nLine 2";Me;2023-01-01;1;';
            const result = importFromCsv('ACTIONS', csv, {});
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.length).toBeGreaterThan(0);
            expect(result.data[0].action).toBe('Line 1\nLine 2');
        });
    });
});
