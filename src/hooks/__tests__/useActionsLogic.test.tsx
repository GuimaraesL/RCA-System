import { renderHook, act } from '@testing-library/react';
import { useActionsLogic } from '../useActionsLogic';
import { vi, describe, it, expect } from 'vitest';
import { ActionRecord } from '../../types';

/**
 * Teste: useActionsLogic.test.tsx
 * 
 * Proposta: Validar a lógica de gerenciamento de ações, resolução de nomes de ativos e CRUD.
 * Ações: Testa o enriquecimento de dados (ViewModel), inclusão, edição e exclusão de ações.
 * Execução: Frontend Vitest.
 */

const mockAssets = [
    {
        id: 'AREA_1',
        name: 'Área 1',
        children: [
            { id: 'EQ_1', name: 'Equipamento 1' }
        ]
    }
];

const mockRecords = [
    {
        id: 'RCA_1',
        what: 'Problema no Motor',
        area_id: 'AREA_1',
        equipment_id: 'EQ_1'
    }
];

const mockActions: ActionRecord[] = [
    {
        id: 'ACT1',
        rca_id: 'RCA_1',
        action: 'Trocar rolamento',
        responsible: 'João',
        date: '2023-01-10',
        status: '1'
    }
];

const addAction = vi.fn();
const updateAction = vi.fn();
const deleteAction = vi.fn();

vi.mock('../../context/RcaContext', () => ({
    useRcaContext: () => ({
        actions: mockActions,
        records: mockRecords,
        assets: mockAssets,
        addAction,
        updateAction,
        deleteAction
    })
}));

describe('useActionsLogic', () => {
    it('deve inicializar e enriquecer as ações (ViewModel)', () => {
        const { result } = renderHook(() => useActionsLogic());

        expect(result.current.actions).toHaveLength(1);
        const action = result.current.actions[0];

        expect(action.rcaTitle).toBe('Problema no Motor');
        expect(action.assetName).toBe('Equipamento 1');
        expect(action.yearStr).toBe('2023');
        expect(action.monthStr).toBe('01');
        expect(action.searchContext).toContain('trocar rolamento');
        expect(action.searchContext).toContain('joao');
    });

    it('deve preparar a lista de RCAs para o seletor', () => {
        const { result } = renderHook(() => useActionsLogic());

        expect(result.current.rcaList).toHaveLength(1);
        expect(result.current.rcaList[0]).toEqual({
            id: 'RCA_1',
            title: 'Problema no Motor'
        });
    });

    it('deve chamar addAction ao salvar nova ação', () => {
        const { result } = renderHook(() => useActionsLogic());

        const newAction: ActionRecord = {
            id: '',
            rca_id: 'RCA_1',
            action: 'Nova Ação',
            responsible: 'Maria',
            date: '2023-02-15',
            status: '1'
        };

        act(() => {
            result.current.handleSave(newAction);
        });

        expect(addAction).toHaveBeenCalledWith(expect.objectContaining({
            action: 'Nova Ação',
            id: expect.stringContaining('ACT-')
        }));
    });

    it('deve chamar updateAction ao salvar ação existente', () => {
        const { result } = renderHook(() => useActionsLogic());

        // Simula que estamos editando ACT1
        act(() => {
            result.current.openEdit(result.current.actions[0]);
        });

        const updated = { ...result.current.editingAction!, action: 'Ação Atualizada' };

        act(() => {
            result.current.handleSave(updated as ActionRecord);
        });

        expect(updateAction).toHaveBeenCalledWith(expect.objectContaining({
            id: 'ACT1',
            action: 'Ação Atualizada'
        }));
    });

    it('deve gerenciar o estado do modal de exclusão', () => {
        const { result } = renderHook(() => useActionsLogic());

        act(() => {
            result.current.handleDelete('ACT1');
        });

        expect(result.current.deleteModalOpen).toBe(true);

        act(() => {
            result.current.confirmDelete();
        });

        expect(deleteAction).toHaveBeenCalledWith('ACT1');
        expect(result.current.deleteModalOpen).toBe(false);
    });
});
