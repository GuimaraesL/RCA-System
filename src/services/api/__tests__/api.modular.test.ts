/**
 * Teste: api.modular.test.ts
 * 
 * Proposta: Validar as funções de comunicação com a API REST de forma isolada.
 * Ações: Mocking do fetch global para simular respostas bem-sucedidas e falhas da API em diferentes endpoints (Assets, RCAs).
 * Execução: Frontend Vitest.
 * Fluxo: Configuração do mock de fetch -> Chamada da função de serviço (fetchAssets, fetchRecords) -> Verificação de mapeamento de dados e tratamento de erros HTTP.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../index';

// Mock do fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Service Modularizado', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Assets (Ativos)', () => {
        it('deve buscar ativos com sucesso', async () => {
            const mockAssets = [{ id: '1', name: 'Asset 1', type: 'AREA' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockAssets)
            });

            const assets = await api.fetchAssets();
            expect(assets).toEqual(mockAssets);
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/assets'));
        });
    });

    describe('RCAs (Análises)', () => {
        it('deve buscar registros com sucesso', async () => {
            const mockRecords = [{ id: 'R1', what: 'Problem' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockRecords)
            });

            const records = await api.fetchRecords();
            expect(records).toEqual(mockRecords);
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/rcas'));
        });
    });

    describe('Error Handling (Tratamento de Erros)', () => {
        it('deve lançar erro descritivo em falha da API', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: 'Internal Server Error', details: 'DB Failure' })
            });

            await expect(api.fetchAssets()).rejects.toThrow('Internal Server Error ("DB Failure")');
        });
    });
});

