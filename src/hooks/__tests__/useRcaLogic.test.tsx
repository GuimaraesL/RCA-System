/**
 * Teste: useRcaLogic.test.tsx
 * 
 * Proposta: Validar as regras de negócio e validação de formulários do Wizard RCA via hook customizado.
 * Ações: Simulação de salvamento com campos obrigatórios ausentes em diferentes passos do Wizard.
 * Execução: Frontend Vitest com React Testing Library.
 * Fluxo: Renderização do hook com wrapper de contexto -> Preenchimento de dados parciais -> Chamada do método handleSave -> Verificação de erros de validação capturados.
 */

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
        await act(async () => {
            await result.current.handleSave();
        });

        expect(onSave).not.toHaveBeenCalled();
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
        await act(async () => {
            await result.current.handleSave();
        });

        expect(onSave).toHaveBeenCalled();
        expect(result.current.validationErrors.root_causes).toBeUndefined();
    });

    it('deve BLOQUEAR salvamento no Passo 4 se campo de CONCLUSÃO estiver faltando', async () => {
        const onSave = vi.fn();
        const { result } = renderHook(() => useRcaLogic(null, onSave), { wrapper });

        // Preenche criação, define status como Concluída e vai para o Passo 4
        act(() => {
            result.current.setFormData(prev => ({ 
                ...prev, 
                what: 'Test Title',
                status: 'STATUS-03' 
            }));
            result.current.setStep(4);
        });

        // Agora root_causes deve ser validado
        await act(async () => {
            await result.current.handleSave();
        });

        expect(onSave).not.toHaveBeenCalled();
        expect(result.current.validationErrors.root_causes).toBe(true);
    });
});
