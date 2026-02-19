/**
 * Teste: useRcaForm.validation.test.ts
 * 
 * Proposta: Teste unitário focado na lógica de validação expandida do hook useRcaForm.
 * Ações: Validação de novos tipos de campos (números, checklists, arrays) conforme Issue #67.
 * Execução: Frontend Vitest (Lightweight).
 */

import { renderHook, act } from '@testing-library/react';
import { useRcaForm } from '../useRcaForm';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock minimalista do contexto para evitar OOM
const mockContext = {
    assets: [],
    taxonomy: {
        mandatoryFields: {
            rca: {
                create: ['downtime_minutes', 'financial_impact', 'lessons_learned', 'precision_maintenance'],
                conclude: []
            }
        }
    },
    actions: [],
    addRecord: vi.fn(),
    updateRecord: vi.fn(),
    refreshAll: vi.fn()
};

vi.mock('../../context/RcaContext', () => ({
    useRcaContext: () => mockContext
}));

vi.mock('../../context/ToastContext', () => ({
    useToast: () => ({
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
        warning: vi.fn()
    })
}));

describe('useRcaForm - Validação de Campos (Issue #67)', () => {
    it('deve aceitar o valor 0 para campos numéricos obrigatórios', async () => {
        const { result } = renderHook(() => useRcaForm(null, vi.fn()));

        act(() => {
            result.current.setFormData(prev => ({ 
                ...prev, 
                downtime_minutes: 0, 
                financial_impact: 0 
            }));
        });

        // Simula tentativa de salvamento para disparar validação
        // Precisamos verificar se 'downtime_minutes' aparece nos erros
        // A função validateForm é interna, mas expõe validationErrors via estado
        await act(async () => {
            await result.current.handleSave();
        });

        expect(result.current.validationErrors.downtime_minutes).toBeUndefined();
        expect(result.current.validationErrors.financial_impact).toBeUndefined();
    });

    it('deve rejeitar Checklist de Precisão incompleto', async () => {
        const { result } = renderHook(() => useRcaForm(null, vi.fn()));

        // Cenário 1: Checklist com item sem status (inválido)
        act(() => {
            result.current.setFormData(prev => ({
                ...prev,
                downtime_minutes: 10,
                financial_impact: 10,
                lessons_learned: ['Lição'],
                precision_maintenance: [
                    { id: '1', activity: 'A', status: '', comment: '' } // Status vazio
                ]
            }));
        });

        await act(async () => {
            await result.current.handleSave();
        });

        expect(result.current.validationErrors.precision_maintenance).toBe(true);

        // Cenário 2: Checklist preenchido (válido)
        act(() => {
            result.current.setFormData(prev => ({
                ...prev,
                precision_maintenance: [
                    { id: '1', activity: 'A', status: 'EXECUTED', comment: '' }
                ]
            }));
        });

        await act(async () => {
            await result.current.handleSave();
        });

        expect(result.current.validationErrors.precision_maintenance).toBeUndefined();
    });

    it('deve rejeitar Array de Lições Aprendidas vazio ou com strings vazias', async () => {
        const { result } = renderHook(() => useRcaForm(null, vi.fn()));

        // Cenário 1: Array vazio
        act(() => {
            result.current.setFormData(prev => ({ ...prev, lessons_learned: [] }));
        });

        await act(async () => {
            await result.current.handleSave();
        });
        expect(result.current.validationErrors.lessons_learned).toBe(true);

        // Cenário 2: Array com string vazia
        act(() => {
            result.current.setFormData(prev => ({ ...prev, lessons_learned: [''] }));
        });

        await act(async () => {
            await result.current.handleSave();
        });
        expect(result.current.validationErrors.lessons_learned).toBe(true);

        // Cenário 3: Válido
        act(() => {
            result.current.setFormData(prev => ({ ...prev, lessons_learned: ['Aprendizado Real'] }));
        });

        await act(async () => {
            await result.current.handleSave();
        });
        expect(result.current.validationErrors.lessons_learned).toBeUndefined();
    });
});
