
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../index';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Service Modularizado', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Assets', () => {
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

    describe('RCAs', () => {
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

    describe('Error Handling', () => {
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
