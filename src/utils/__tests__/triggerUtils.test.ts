/**
 * Teste: triggerUtils.test.ts
 * 
 * Proposta: Validar funções utilitárias de gestão de tempo e visualização de gatilhos.
 * Ações: Testes de cálculo de duração, mapeamento de cores de status e lógica visual do "Farol" de atrasos.
 * Execução: Frontend Vitest.
 * Fluxo: Entrada de datas e IDs de status -> Execução de helpers -> Validação de classes CSS e contagem de dias resultantes.
 */

import { describe, it, expect } from 'vitest';
import { getFarol, calculateDuration, getStatusColor, getAssetName, findAssetPath } from '../triggerHelpers';
import { TaxonomyConfig, AssetNode } from '../../types';

describe('triggerHelpers', () => {
    const mockAssets: AssetNode[] = [
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

    describe('getAssetName', () => {
        it('deve retornar string vazia se nenhum ID for fornecido', () => {
            expect(getAssetName('', mockAssets)).toBe('');
        });

        it('deve retornar o ID se a lista de ativos não for fornecida', () => {
            expect(getAssetName('A1', [])).toBe('A1');
        });

        it('deve retornar o nome correto para uma área de nível superior', () => {
            expect(getAssetName('A1', mockAssets)).toBe('Area 1');
        });

        it('deve retornar o nome correto para um equipamento aninhado', () => {
            expect(getAssetName('E1', mockAssets)).toBe('Equip 1');
        });

        it('deve retornar o nome correto para um subgrupo profundamente aninhado', () => {
            expect(getAssetName('S1', mockAssets)).toBe('Sub 1');
        });

        it('deve retornar o ID se o ativo não for encontrado', () => {
            expect(getAssetName('UNKNOWN', mockAssets)).toBe('UNKNOWN');
        });
    });

    describe('findAssetPath', () => {
        it('deve retornar o caminho completo para um nó aninhado', () => {
            const path = findAssetPath(mockAssets, 'S1');
            expect(path).toBeDefined();
            expect(path?.length).toBe(3);
            expect(path?.[0].id).toBe('A1');
            expect(path?.[1].id).toBe('E1');
            expect(path?.[2].id).toBe('S1');
        });

        it('deve retornar nulo se o nó não for encontrado', () => {
            expect(findAssetPath(mockAssets, 'UNKNOWN')).toBeNull();
        });
    });

    describe('calculateDuration', () => {
        it('deve calcular a duração em minutos corretamente', () => {
            const start = '2023-01-01T10:00:00';
            const end = '2023-01-01T11:30:00';
            expect(calculateDuration(start, end)).toBe(90);
        });

        it('deve retornar 0 para datas inválidas', () => {
            expect(calculateDuration('', '')).toBe(0);
        });
    });

    describe('getStatusColor', () => {
        const mockTaxonomy: TaxonomyConfig = {
            triggerStatuses: [
                { id: 'T-STATUS-01', name: 'Não iniciada' },
                { id: 'T-STATUS-02', name: 'Em andamento' },
                { id: 'T-STATUS-03', name: 'Concluída' }
            ],
            analysisTypes: [],
            analysisStatuses: [],
            specialties: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCauseMs: [],
            mandatoryFields: {
                rca: { create: [], conclude: [] },
                trigger: { save: [] }
            }
        };

        it('deve retornar azul para T-STATUS-01 (NEW)', () => {
            expect(getStatusColor('T-STATUS-01', mockTaxonomy)).toContain('bg-primary-50');
        });

        it('deve retornar amber para T-STATUS-02 (IN_ANALYSIS)', () => {
            expect(getStatusColor('T-STATUS-02', mockTaxonomy)).toContain('bg-amber-50');
        });

        it('deve retornar emerald para T-STATUS-03 (CONVERTED)', () => {
            expect(getStatusColor('T-STATUS-03', mockTaxonomy)).toContain('bg-emerald-50');
        });

        it('deve retornar slate para status desconhecido', () => {
            expect(getStatusColor('UNKNOWN', mockTaxonomy)).toContain('bg-slate-50');
        });
    });

    describe('getFarol', () => {
        const mockTaxonomy: TaxonomyConfig = {
            triggerStatuses: [
                { id: 'STATUS-01', name: 'Não iniciada' },
                { id: 'STATUS-03', name: 'Concluída' }
            ],
            analysisTypes: [],
            analysisStatuses: [],
            specialties: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCauseMs: [],
            mandatoryFields: {
                rca: { create: [], conclude: [] },
                trigger: { save: [] }
            }
        };

        it('deve retornar check para status concluído', () => {
            const result = getFarol('2023-01-01', 'STATUS-03', mockTaxonomy);
            expect(result.days).toBe('CHECK');
            expect(result.color).toContain('bg-green-100');
            expect(result.color).toContain('border-green-200');
        });

        it('deve retornar vermelho para gatilhos abertos antigos (>7 dias)', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10);
            const result = getFarol(oldDate.toISOString(), 'STATUS-01', mockTaxonomy);
            expect(result.color).toContain('bg-red-100');
            expect(result.days).toBeGreaterThanOrEqual(9);
        });

        it('deve retornar amarelo para gatilhos abertos médios (3-7 dias)', () => {
            const medDate = new Date();
            medDate.setDate(medDate.getDate() - 4);
            const result = getFarol(medDate.toISOString(), 'STATUS-01', mockTaxonomy);
            expect(result.color).toContain('bg-yellow-100');
            expect(result.days).toBeGreaterThanOrEqual(3);
        });

        it('deve retornar verde para novos gatilhos abertos (<3 dias)', () => {
            const newDate = new Date();
            // menos de 3 dias
            newDate.setDate(newDate.getDate() - 1);
            const result = getFarol(newDate.toISOString(), 'STATUS-01', mockTaxonomy);
            expect(result.color).toContain('bg-green-100');
            expect(result.days).toBeLessThan(3);
        });
    });
});
