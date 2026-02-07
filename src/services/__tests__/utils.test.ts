/**
 * Teste: utils.test.ts
 * 
 * Proposta: Validar funções utilitárias do sistema, como geração de IDs e sanitização de strings.
 * Ações: Verificação de unicidade de IDs, remoção de tags HTML em strings e filtragem hierárquica de ativos.
 * Execução: Frontend Vitest.
 * Fluxo: Chamada de funções utilitárias -> Comparação de resultados com expectativas de segurança e estrutura.
 */

import { describe, it, expect } from 'vitest';
import { filterAssetsByUsage, generateId, sanitizeString } from '../utils';
import { AssetNode } from '../../types';

describe('Service Utils', () => {
    describe('generateId', () => {
        it('deve gerar um ID com o prefixo especificado', () => {
            const id = generateId('TEST');
            expect(id.startsWith('TEST-')).toBe(true);
        });

        it('deve gerar IDs únicos', () => {
            const id1 = generateId('TEST');
            const id2 = generateId('TEST');
            expect(id1).not.toBe(id2);
        });
    });

    describe('sanitizeString', () => {
        it('deve remover tags HTML', () => {
            const input = '<script>alert("XSS")</script>Hello <b>World</b>';
            const output = sanitizeString(input);
            expect(output).toBe('alert("XSS")Hello World');
        });

        it('deve retornar string vazia para entradas não-string', () => {
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
            expect(sanitizeString(123)).toBe('');
        });
    });

    describe('filterAssetsByUsage', () => {
        const assets: AssetNode[] = [
            {
                id: 'A1', name: 'Area 1', type: 'AREA', children: [
                    {
                        id: 'E1', name: 'Equip 1', type: 'EQUIPMENT', children: [
                            { id: 'S1', name: 'Sub 1', type: 'SUBGROUP' },
                            { id: 'S2', name: 'Sub 2', type: 'SUBGROUP' }
                        ]
                    },
                    {
                        id: 'E2', name: 'Equip 2', type: 'EQUIPMENT', children: [
                            { id: 'S3', name: 'Sub 3', type: 'SUBGROUP' }
                        ]
                    }
                ]
            },
            {
                id: 'A2', name: 'Area 2', type: 'AREA', children: []
            }
        ];

        it('deve retornar array vazio se nenhum ID corresponder', () => {
            const usedIds = new Set(['UNKNOWN']);
            const result = filterAssetsByUsage(assets, usedIds);
            expect(result.length).toBe(0);
        });

        it('deve incluir a área raiz se um de seus filhos estiver em uso', () => {
            const usedIds = new Set(['S1']);
            const result = filterAssetsByUsage(assets, usedIds);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('A1');
            expect(result[0].children?.length).toBe(1);
            expect(result[0].children?.[0].id).toBe('E1');
            expect(result[0].children?.[0].children?.length).toBe(1);
            expect(result[0].children?.[0].children?.[0].id).toBe('S1');
        });

        it('deve incluir múltiplos ramos se múltiplos filhos forem usados', () => {
            const usedIds = new Set(['S1', 'S3']);
            const result = filterAssetsByUsage(assets, usedIds);
            expect(result.length).toBe(1);
            expect(result[0].children?.length).toBe(2);
            expect(result[0].children?.map(c => c.id)).toContain('E1');
            expect(result[0].children?.map(c => c.id)).toContain('E2');
        });

        it('deve incluir a raiz se ela mesma for usada, mesmo sem filhos usados', () => {
            const usedIds = new Set(['A2']);
            const result = filterAssetsByUsage(assets, usedIds);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('A2');
        });
    });
});
