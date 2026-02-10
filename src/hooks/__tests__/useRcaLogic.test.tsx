
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRcaLogic } from '../useRcaLogic';
import { RcaProvider } from '../../context/RcaContext';
import React from 'react';

// Mock do Contexto para isolar o hook
vi.mock('../../context/RcaContext', async () => {
    const actual = await vi.importActual('../../context/RcaContext');
    return {
        ...actual,
        useRcaContext: () => ({
            assets: [],
            taxonomy: {
                analysisStatuses: [{ id: 'STATUS-01', name: 'Open' }],
                analysisTypes: [],
                specialties: [],
                failureModes: [],
                failureCategories: [],
                componentTypes: [],
                rootCauseMs: [],
                triggerStatuses: [],
                mandatoryFields: {
                    rca: {
                        create: ['what'],
                        conclude: ['root_causes']
                    },
                    trigger: { save: [] }
                }
            },
            actions: [],
            updateRecord: vi.fn(),
            addRecord: vi.fn()
        })
    };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RcaProvider>{children}</RcaProvider>
);

describe('useRcaLogic - Tiered Validation', () => {
    it('deve bloquear salvamento se campo de CRIAÇÃO estiver faltando (Passo 1)', async () => {
        const onSave = vi.fn();
        const { result } = renderHook(() => useRcaLogic(null, onSave), { wrapper });

        // Tenta salvar com 'what' vazio
        let saved = false;
        await act(async () => {
            saved = await result.current.handleSave();
        });

        expect(saved).toBe(false);
        expect(result.current.validationErrors.what).toBe(true);
    });

    it('deve permitir salvamento no início se campo de CONCLUSÃO estiver faltando', async () => {
        const onSave = vi.fn();
        const { result } = renderHook(() => useRcaLogic(null, onSave), { wrapper });

        // Preenche campo de criação
        act(() => {
            result.current.setFormData(prev => ({ ...prev, what: 'Test Title' }));
        });

        // 'root_causes' é obrigatório para conclusão, mas estamos no Passo 1
        let saved = false;
        await act(async () => {
            saved = await result.current.handleSave();
        });

        expect(saved).toBe(true);
        expect(result.current.validationErrors.root_causes).toBeUndefined();
    });

    it('deve BLOQUEAR salvamento no Passo 4 se campo de CONCLUSÃO estiver faltando', async () => {
        const onSave = vi.fn();
        const { result } = renderHook(() => useRcaLogic(null, onSave), { wrapper });

        // Preenche criação e vai para o Passo 4
        act(() => {
            result.current.setFormData(prev => ({ ...prev, what: 'Test Title' }));
            result.current.setStep(4);
        });

        // Agora root_causes deve ser validado
        let saved = false;
        await act(async () => {
            saved = await result.current.handleSave();
        });

        expect(saved).toBe(false);
        expect(result.current.validationErrors.root_causes).toBe(true);
    });
});
