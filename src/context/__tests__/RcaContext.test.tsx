import { renderHook, act, waitFor } from '@testing-library/react';
import { RcaProvider, useRcaContext } from '../RcaContext';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import * as api from '../../services/apiService';
import * as storage from '../../services/storageService';
import { RcaRecord, ActionRecord, TriggerRecord, TaxonomyConfig } from '../../types';

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
        vi.mocked(api.saveTriggerToApi).mockResolvedValue(undefined as any);
        vi.mocked(api.deleteRecordFromApi).mockResolvedValue(undefined as any);
        vi.mocked(api.deleteActionFromApi).mockResolvedValue(undefined as any);
        vi.mocked(api.deleteTriggerFromApi).mockResolvedValue(undefined as any);
        vi.mocked(api.importAssetsToApi).mockResolvedValue(undefined as any);
        vi.mocked(api.saveTaxonomyToApi).mockResolvedValue(undefined as any);
    });

    afterEach(() => {
        // Teardown
        fetchSpy.mockRestore();
    });

    describe('Initialization', () => {
        it('should initialize using API when healthcheck responds with OK', async () => {
            fetchSpy.mockResolvedValueOnce({ ok: true });
            vi.mocked(api.fetchRecords).mockResolvedValue([{ id: 'API_1' } as any]);

            const { result } = renderHook(() => useRcaContext(), { wrapper });

            await waitFor(() => {
                expect(result.current.useApi).toBe(true);
                expect(result.current.isLoading).toBe(false);
            });

            expect(api.fetchRecords).toHaveBeenCalled();
            expect(result.current.records).toEqual([{ id: 'API_1' }]);
        });

        it('should fallback to LocalStorage when healthcheck fails', async () => {
            fetchSpy.mockRejectedValueOnce(new Error('Network Error'));
            vi.mocked(storage.LEGACY_getRecords).mockReturnValue([{ id: 'STORAGE_1' } as any]);

            const { result } = renderHook(() => useRcaContext(), { wrapper });

            await waitFor(() => {
                expect(result.current.useApi).toBe(false);
                expect(result.current.isLoading).toBe(false);
            });

            expect(storage.LEGACY_getRecords).toHaveBeenCalled();
            expect(result.current.records).toEqual([{ id: 'STORAGE_1' }]);
        });

        it('should handle API errors during initialization and load fallback data', async () => {
            fetchSpy.mockResolvedValueOnce({ ok: true });
            vi.mocked(api.fetchRecords).mockRejectedValueOnce(new Error('API Crash'));
            vi.mocked(storage.LEGACY_getRecords).mockReturnValue([{ id: 'FALLBACK' } as any]);

            const { result } = renderHook(() => useRcaContext(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.records).toEqual([{ id: 'FALLBACK' }]);
            }, { timeout: 3000 });
        });
    });

    describe('Mutation Operations (API Mode)', () => {
        beforeEach(async () => {
            fetchSpy.mockResolvedValue({ ok: true });
        });

        it('should add a record via API and update state', async () => {
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(true));

            const newRecord = { id: 'NEW_R' } as RcaRecord;
            await act(async () => {
                await result.current.addRecord(newRecord);
            });

            expect(api.saveRecordToApi).toHaveBeenCalledWith(newRecord, false);
            expect(result.current.records).toContainEqual(newRecord);
        });

        it('should update a record via API and update state', async () => {
            vi.mocked(api.fetchRecords).mockResolvedValue([{ id: 'R1', what: 'Old' } as any]);
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.records.length).toBe(1));

            const updatedRecord = { id: 'R1', what: 'New' } as RcaRecord;
            await act(async () => {
                await result.current.updateRecord(updatedRecord);
            });

            expect(api.saveRecordToApi).toHaveBeenCalledWith(updatedRecord, true);
            expect(result.current.records[0].what).toBe('New');
        });

        it('should delete a record via API and update state', async () => {
            vi.mocked(api.fetchRecords).mockResolvedValue([{ id: 'R1' } as any]);
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.records.length).toBe(1));

            await act(async () => {
                await result.current.deleteRecord('R1');
            });

            expect(api.deleteRecordFromApi).toHaveBeenCalledWith('R1');
            expect(result.current.records.length).toBe(0);
        });

        it('should handle actions CRUD', async () => {
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(true));

            const action = { id: 'A1' } as ActionRecord;
            await act(async () => {
                await result.current.addAction(action);
            });
            expect(result.current.actions).toContainEqual(action);

            await act(async () => {
                await result.current.updateAction({ ...action, action: 'Updated' } as any);
            });
            expect(result.current.actions[0].action).toBe('Updated');

            await act(async () => {
                await result.current.deleteAction('A1');
            });
            expect(result.current.actions.length).toBe(0);
        });

        it('should handle triggers CRUD', async () => {
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(true));

            const trigger = { id: 'T1' } as TriggerRecord;
            await act(async () => {
                await result.current.addTrigger(trigger);
            });
            expect(result.current.triggers).toContainEqual(trigger);

            await act(async () => {
                await result.current.updateTrigger({ ...trigger, comments: 'New' } as any);
            });
            expect(result.current.triggers[0].comments).toBe('New');

            await act(async () => {
                await result.current.deleteTrigger('T1');
            });
            expect(result.current.triggers.length).toBe(0);
        });

        it('should update assets and taxonomy', async () => {
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(true));

            const newAssets = [{ id: 'AS1', name: 'Asset' }] as any;
            await act(async () => {
                await result.current.updateAssets(newAssets);
            });
            expect(api.importAssetsToApi).toHaveBeenCalled();
            expect(result.current.assets).toEqual(newAssets);

            const newTax = { analysisTypes: [{ id: 'T1', name: 'T' }] } as any;
            await act(async () => {
                await result.current.updateTaxonomy(newTax);
            });
            expect(api.saveTaxonomyToApi).toHaveBeenCalled();
            expect(result.current.taxonomy).toEqual(newTax);
        });
    });

    describe('Mutation Operations (Offline Mode)', () => {
        beforeEach(async () => {
            fetchSpy.mockRejectedValue(new Error('Offline'));
        });

        it('should add a record via Storage and update state', async () => {
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(false));

            const newRecord = { id: 'NEW_R' } as RcaRecord;
            await act(async () => {
                await result.current.addRecord(newRecord);
            });

            expect(storage.saveRecord).toHaveBeenCalledWith(newRecord);
            expect(result.current.records).toContainEqual(newRecord);
        });

        it('should delete a record via Storage and update state', async () => {
            vi.mocked(storage.LEGACY_getRecords).mockReturnValue([{ id: 'R1' } as any]);
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.records.length).toBe(1));

            await act(async () => {
                await result.current.deleteRecord('R1');
            });

            expect(storage.saveRecords).toHaveBeenCalled();
            expect(result.current.records.length).toBe(0);
        });

        it('should update action via Storage', async () => {
            vi.mocked(storage.LEGACY_getActions).mockReturnValue([{ id: 'A1', action: 'Old' } as any]);
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(false));

            await act(async () => {
                await result.current.updateAction({ id: 'A1', action: 'New' } as any);
            });

            expect(storage.saveAction).toHaveBeenCalled();
            expect(result.current.actions[0].action).toBe('New');
        });

        it('should delete an action via Storage', async () => {
            vi.mocked(storage.LEGACY_getActions).mockReturnValue([{ id: 'A1' } as any]);
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(false));

            await act(async () => {
                await result.current.deleteAction('A1');
            });

            expect(storage.deleteAction).toHaveBeenCalledWith('A1');
            expect(result.current.actions.length).toBe(0);
        });

        it('should add/update/delete trigger via Storage', async () => {
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(false));

            const trigger = { id: 'T1' } as TriggerRecord;
            await act(async () => {
                await result.current.addTrigger(trigger);
            });
            expect(storage.saveTrigger).toHaveBeenCalled();
            expect(result.current.triggers).toContainEqual(trigger);

            await act(async () => {
                await result.current.updateTrigger({ ...trigger, comments: 'New' } as any);
            });
            expect(storage.saveTrigger).toHaveBeenCalledTimes(2);

            await act(async () => {
                await result.current.deleteTrigger('T1');
            });
            expect(storage.deleteTrigger).toHaveBeenCalledWith('T1');
        });

        it('should update assets and taxonomy via Storage', async () => {
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(false));

            const newAssets = [{ id: 'AS1' }] as any;
            await act(async () => {
                await result.current.updateAssets(newAssets);
            });
            expect(storage.saveAssets).toHaveBeenCalledWith(newAssets);

            const newTax = { triggerStatuses: [] } as any;
            await act(async () => {
                await result.current.updateTaxonomy(newTax);
            });
            expect(storage.saveTaxonomy).toHaveBeenCalledWith(newTax);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        beforeEach(() => {
            fetchSpy.mockResolvedValue({ ok: true });
        });

        it('should call refreshAll when mutation fails (API mode)', async () => {
            vi.mocked(api.saveRecordToApi).mockRejectedValueOnce(new Error('API Error'));
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(true));

            vi.clearAllMocks();
            await act(async () => {
                try { await result.current.addRecord({ id: 'R1' } as any); } catch (e) { }
            });
            expect(api.fetchRecords).toHaveBeenCalled();
        });

        it('should call refreshAll when mutation fails (Offline mode)', async () => {
            fetchSpy.mockRejectedValue(new Error('Offline'));
            vi.mocked(storage.saveRecord).mockImplementationOnce(() => { throw new Error('Storage Error'); });

            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(false));

            vi.clearAllMocks();
            await act(async () => {
                try { await result.current.addRecord({ id: 'R1' } as any); } catch (e) { }
            });
            expect(storage.LEGACY_getRecords).toHaveBeenCalled();
        });

        it('should handle errors in updateRecord, deleteRecord, etc', async () => {
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(true));

            vi.mocked(api.saveRecordToApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.updateRecord({ id: 'R1' } as any); } catch (e) { } });

            vi.mocked(api.deleteRecordFromApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.deleteRecord('R1'); } catch (e) { } });

            vi.mocked(api.saveActionToApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.addAction({ id: 'A1' } as any); } catch (e) { } });

            vi.mocked(api.saveActionToApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.updateAction({ id: 'A1' } as any); } catch (e) { } });

            vi.mocked(api.deleteActionFromApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.deleteAction('A1'); } catch (e) { } });

            vi.mocked(api.saveTriggerToApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.addTrigger({ id: 'T1' } as any); } catch (e) { } });

            vi.mocked(api.saveTriggerToApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.updateTrigger({ id: 'T1' } as any); } catch (e) { } });

            vi.mocked(api.deleteTriggerFromApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.deleteTrigger('T1'); } catch (e) { } });

            vi.mocked(api.importAssetsToApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.updateAssets([]); } catch (e) { } });

            vi.mocked(api.saveTaxonomyToApi).mockRejectedValueOnce(new Error('Fail'));
            await act(async () => { try { await result.current.updateTaxonomy({} as any); } catch (e) { } });

            expect(api.fetchRecords).toHaveBeenCalled();
        });

        it('should throw error when useRcaContext is used outside RcaProvider', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            expect(() => renderHook(() => useRcaContext())).toThrow('useRcaContext deve ser utilizado dentro de um RcaProvider');
            consoleSpy.mockRestore();
        });

        it('should trigger refreshAll when a relevant storage event occurs', async () => {
            fetchSpy.mockResolvedValueOnce({ ok: true });
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(true));

            vi.clearAllMocks();

            act(() => {
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'rca_record_updated',
                    newValue: 'something'
                }));
            });

            // Verifica se disparou o refresh (fetchRecords é chamado no refreshAll)
            await waitFor(() => {
                expect(api.fetchRecords).toHaveBeenCalled();
            });
        });

        it('should set useApi to false when healthcheck response is not ok', async () => {
            fetchSpy.mockResolvedValueOnce({ ok: false });
            const { result } = renderHook(() => useRcaContext(), { wrapper });

            await waitFor(() => {
                expect(result.current.useApi).toBe(false);
            });
        });

        it('should update record via Storage in offline mode (branch coverage)', async () => {
            fetchSpy.mockRejectedValue(new Error('Offline'));
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(false));

            const record = { id: 'R1', what: 'Updated' } as any;
            await act(async () => {
                await result.current.updateRecord(record);
            });

            expect(storage.saveRecord).toHaveBeenCalledWith(record);
        });

        it('should add action via Storage in offline mode (branch coverage)', async () => {
            fetchSpy.mockRejectedValue(new Error('Offline'));
            const { result } = renderHook(() => useRcaContext(), { wrapper });
            await waitFor(() => expect(result.current.useApi).toBe(false));

            const action = { id: 'A1' } as any;
            await act(async () => {
                await result.current.addAction(action);
            });

            expect(storage.saveAction).toHaveBeenCalledWith(action);
        });
    });
});
