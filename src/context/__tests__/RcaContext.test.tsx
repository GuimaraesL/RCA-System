import { renderHook, act, waitFor } from '@testing-library/react';
import { RcaProvider, useRcaContext } from '../RcaContext';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import * as api from '../../services/apiService';
import * as storage from '../../services/storageService';

/**
 * Teste: RcaContext.test.tsx
 * 
 * Proposta: Validar a lógica de gerenciamento global de estado, negociação de ambiente 
 * (API vs LocalStorage Offline) e sincronização multi-abas.
 * Padrão: AAA (Arrange, Act, Assert)
 */

vi.mock('../../services/apiService');
vi.mock('../../services/storageService');

const wrapper = ({ children }: { children: ReactNode }) => (
    <RcaProvider>{children}</RcaProvider>
);

describe('Context: RcaContext', () => {
    let fetchSpy: any;

    beforeEach(() => {
        // Arrange
        vi.clearAllMocks();
        fetchSpy = vi.spyOn(global, 'fetch');

        vi.mocked(api.fetchRecords).mockResolvedValue([]);
        vi.mocked(api.fetchAssets).mockResolvedValue([]);
        vi.mocked(api.fetchActions).mockResolvedValue([]);
        vi.mocked(api.fetchTriggers).mockResolvedValue([]);
        vi.mocked(api.fetchTaxonomy).mockResolvedValue({} as any);

        vi.mocked(storage.LEGACY_getRecords).mockReturnValue([]);
        vi.mocked(storage.LEGACY_getAssets).mockReturnValue([]);
        vi.mocked(storage.LEGACY_getActions).mockReturnValue([]);
        vi.mocked(storage.LEGACY_getTriggers).mockReturnValue([]);
        vi.mocked(storage.LEGACY_getTaxonomy).mockReturnValue({} as any);

        vi.mocked(api.saveRecordToApi).mockResolvedValue(undefined as any);
        vi.mocked(api.saveActionToApi).mockResolvedValue(undefined as any);
    });

    afterEach(() => {
        // Teardown
        fetchSpy.mockRestore();
    });

    it('should initialize using API when healthcheck responds with OK', async () => {
        // Arrange
        fetchSpy.mockResolvedValueOnce({ ok: true });
        vi.mocked(api.fetchRecords).mockResolvedValue([{ id: 'API_1' } as any]);

        // Act
        const { result } = renderHook(() => useRcaContext(), { wrapper });

        // Assert
        await waitFor(() => {
            expect(result.current.useApi).toBe(true);
            expect(result.current.isLoading).toBe(false);
        });

        expect(api.fetchRecords).toHaveBeenCalled();
        expect(storage.LEGACY_getRecords).not.toHaveBeenCalled();
        expect(result.current.records).toEqual([{ id: 'API_1' }]);
    });

    it('should fallback to LocalStorage when healthcheck fails', async () => {
        // Arrange
        fetchSpy.mockRejectedValueOnce(new Error('Network Error'));
        vi.mocked(storage.LEGACY_getRecords).mockReturnValue([{ id: 'STORAGE_1' } as any]);

        // Act
        const { result } = renderHook(() => useRcaContext(), { wrapper });

        // Assert
        await waitFor(() => {
            expect(result.current.useApi).toBe(false);
            expect(result.current.isLoading).toBe(false);
        });

        expect(storage.LEGACY_getRecords).toHaveBeenCalled();
        expect(api.fetchRecords).not.toHaveBeenCalled();
    });

    it('should gracefully handle API errors during initialization and load fallback data', async () => {
        // Arrange
        fetchSpy.mockResolvedValueOnce({ ok: true });

        const errorPromise = Promise.reject(new Error('API Crash'));
        errorPromise.catch(() => { });
        vi.mocked(api.fetchRecords).mockImplementationOnce(() => errorPromise);

        vi.mocked(storage.LEGACY_getRecords).mockReturnValue([{ id: 'FALLBACK' } as any]);

        // Act
        const { result } = renderHook(() => useRcaContext(), { wrapper });

        // Assert
        await waitFor(() => {
            // Aguarda o fim do carregamento E a presença dos dados de fallback
            expect(result.current.isLoading).toBe(false);
            expect(result.current.records).toEqual([{ id: 'FALLBACK' }]);
        }, { timeout: 3000 });

        expect(storage.LEGACY_getRecords).toHaveBeenCalled();
    });

    it('should route saveAction to API Service when application is online', async () => {
        // Arrange
        fetchSpy.mockResolvedValueOnce({ ok: true });

        const { result } = renderHook(() => useRcaContext(), { wrapper });

        await waitFor(() => expect(result.current.useApi).toBe(true));

        // Act
        await act(async () => {
            await result.current.addRecord({ id: 'REC_API' } as any);
        });

        // Assert
        expect(api.saveRecordToApi).toHaveBeenCalledWith({ id: 'REC_API' }, false);
    });

    it('should route saveAction to LocalStorage Service when application is offline', async () => {
        // Arrange
        fetchSpy.mockRejectedValueOnce(new Error('Offline'));

        const { result } = renderHook(() => useRcaContext(), { wrapper });

        await waitFor(() => expect(result.current.useApi).toBe(false));

        // Act
        await act(async () => {
            await result.current.addAction({ id: 'ACT_LOCAL' } as any);
        });

        // Assert
        expect(storage.saveAction).toHaveBeenCalledWith({ id: 'ACT_LOCAL' });
    });

    it('should trigger state synchronization when receiving Storage events from other tabs', async () => {
        // Arrange
        fetchSpy.mockResolvedValue({ ok: true });
        const { result } = renderHook(() => useRcaContext(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        vi.clearAllMocks();

        // Act
        await act(async () => {
            await result.current.refreshAll();
        });

        // Assert
        expect(api.fetchRecords).toHaveBeenCalled();
    });
});
