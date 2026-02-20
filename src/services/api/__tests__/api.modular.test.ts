import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../index';
import { RcaRecord, ActionRecord, TriggerRecord, TaxonomyConfig } from '../../../types';

/**
 * Teste: api.modular.test.ts
 * 
 * Proposta: Validar as funções de comunicação com a API REST de forma isolada.
 * Ações: Mocking do fetch global para simular respostas bem-sucedidas e falhas HTTP em endpoints (Assets, RCAs, Actions, Triggers, Taxonomy).
 * Execução: Frontend Vitest.
 * Padrão: AAA (Arrange, Act, Assert) / BDD Naming Convention
 */

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Service: API Modular (apiService)', () => {
    beforeEach(() => {
        // Arrange
        vi.clearAllMocks();
    });

    // ----------------------------------------------------------------------
    // ASSETS (ATIVOS)
    // ----------------------------------------------------------------------
    describe('Assets Integration', () => {
        it('should fetch assets successfully when API returns OK', async () => {
            // Arrange
            const mockAssets = [{ id: '1', name: 'Asset 1', type: 'AREA' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockAssets)
            });

            // Act
            const assets = await api.fetchAssets();

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/assets'));
            expect(assets).toEqual(mockAssets);
        });

        it('should send POST request to import assets in bulk', async () => {
            // Arrange
            const mockAssetsToImport = [{ id: '1', name: 'Asset 1' }] as any[];

            // First fetch: /assets/flat inside the clear method
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            // Second fetch: /assets/bulk
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify({ success: true })
            });

            // Act
            await api.importAssetsToApi(mockAssetsToImport);

            // Assert
            // Note: asset import flattens the hierarchy and defaults parent_id to null
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/assets/bulk'), expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{ id: '1', name: 'Asset 1', parent_id: null }])
            }));
        });
    });

    // ----------------------------------------------------------------------
    // RCAS (REGISTROS / ANÁLISES)
    // ----------------------------------------------------------------------
    describe('RCAs Integration', () => {
        it('should fetch records successfully when API returns OK', async () => {
            // Arrange
            const mockRecords = [{ id: 'R1', what: 'Problem' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockRecords)
            });

            // Act
            const records = await api.fetchRecords();

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/rcas'));
            expect(records).toEqual(mockRecords);
        });

        it('should send POST request when saving a new RCA record', async () => {
            // Arrange
            const newRecord: RcaRecord = { id: 'NEW_1', what: 'New RCA' } as RcaRecord;
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.saveRecordToApi(newRecord, false); // false = isUpdate (should use POST)

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/rcas'), expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecord)
            }));
        });

        it('should send PUT request when updating an existing RCA record', async () => {
            // Arrange
            const existingRecord: RcaRecord = { id: 'EXISTING_1', what: 'Updated RCA' } as RcaRecord;
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.saveRecordToApi(existingRecord, true); // true = isUpdate (should use PUT)

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/rcas/EXISTING_1'), expect.objectContaining({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(existingRecord)
            }));
        });

        it('should send DELETE request to remove a specific RCA record', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.deleteRecordFromApi('DEL_1');

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/rcas/DEL_1'), expect.objectContaining({
                method: 'DELETE'
            }));
        });
    });

    // ----------------------------------------------------------------------
    // ACTIONS (AÇÕES)
    // ----------------------------------------------------------------------
    describe('Actions Integration', () => {
        it('should fetch actions successfully', async () => {
            // Arrange
            const mockActions = [{ id: 'A1', action: 'Do something' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockActions)
            });

            // Act
            const actions = await api.fetchActions();

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/actions'));
            expect(actions).toEqual(mockActions);
        });

        it('should send POST request when saving a new logic Action', async () => {
            // Arrange
            const newAction: ActionRecord = { id: 'NEW_ACT', action: 'Write Test' } as ActionRecord;
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.saveActionToApi(newAction, false); // explicitly POST

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/actions'), expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAction)
            }));
        });

        it('should send PUT request when updating an existing logic Action', async () => {
            // Arrange
            const existingAction: ActionRecord = { id: 'ACT_UPDATE', action: 'Write Docs' } as ActionRecord;
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.saveActionToApi(existingAction, true); // explicitly PUT

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`/actions/${existingAction.id}`), expect.objectContaining({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            }));
        });

        it('should send DELETE request to remove a specific action', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.deleteActionFromApi('A_DEL');

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/actions/A_DEL'), expect.objectContaining({
                method: 'DELETE'
            }));
        });
    });

    // ----------------------------------------------------------------------
    // TRIGGERS (GATILHOS)
    // ----------------------------------------------------------------------
    describe('Triggers Integration', () => {
        it('should fetch triggers successfully', async () => {
            // Arrange
            const mockList = [{ id: 'TRG_1', condition: 'Temp > 100' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockList)
            });

            // Act
            const triggers = await api.fetchTriggers();

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/triggers'));
            expect(triggers).toEqual(mockList);
        });

        it('should send POST request to save a trigger (new)', async () => {
            // Arrange
            const trigger: TriggerRecord = { id: 'TRG_NEW' } as unknown as TriggerRecord;
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.saveTriggerToApi(trigger, false); // explicitly POST

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/triggers'), expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(trigger)
            }));
        });

        it('should send PUT request to save a trigger (update)', async () => {
            // Arrange
            const trigger: TriggerRecord = { id: 'TRG_UPD' } as unknown as TriggerRecord;
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.saveTriggerToApi(trigger, true); // explicitly PUT

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`/triggers/${trigger.id}`), expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify(trigger)
            }));
        });

        it('should send DELETE request to remove a specific trigger', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.deleteTriggerFromApi('TRG_DEL');

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/triggers/TRG_DEL'), expect.objectContaining({
                method: 'DELETE'
            }));
        });
    });

    // ----------------------------------------------------------------------
    // TAXONOMY (TAXONOMIA / CONFIG)
    // ----------------------------------------------------------------------
    describe('Taxonomy Integration', () => {
        it('should fetch taxonomy configuration successfully', async () => {
            // Arrange
            const mockTax: TaxonomyConfig = { failureModes: [], specialties: [] } as unknown as TaxonomyConfig;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockTax)
            });

            // Act
            const tax = await api.fetchTaxonomy();

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/taxonomy'));
            expect(tax).toEqual(mockTax);
        });

        it('should send PUT request to replace taxonomy global state', async () => {
            // Arrange
            const tax: TaxonomyConfig = { failureModes: [], specialties: [] } as unknown as TaxonomyConfig;
            mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) });

            // Act
            await api.saveTaxonomyToApi(tax);

            // Assert
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/taxonomy'), expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify(tax)
            }));
        });
    });

    // ----------------------------------------------------------------------
    // ERROR HANDLING
    // ----------------------------------------------------------------------
    describe('Error Handling Middleware', () => {
        it('should throw explanatory error when API responds with structured JSON error', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: 'Internal Server Error', details: 'DB Failure' })
            });

            // Act & Assert
            await expect(api.fetchAssets()).rejects.toThrow('Internal Server Error ("DB Failure")');
        });

        it('should format fallback string when API fails without JSON context', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON') }
            });

            // Act & Assert
            // when json() payload fails catching generates { error: 'Erro desconhecido' }
            await expect(api.fetchRecords()).rejects.toThrow('Erro desconhecido');
        });
    });
});
