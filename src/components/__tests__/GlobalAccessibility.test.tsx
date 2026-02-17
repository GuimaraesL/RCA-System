/**
 * Teste: GlobalAccessibility.test.tsx
 * 
 * Proposta: Validar a acessibilidade global do RCA System através da verificação de labels e atributos ARIA.
 * Ações: Renderização de múltiplos componentes (Input, Select, Modais, Wizard) e verificação da associação correta de labels via IDs únicos.
 * Execução: Frontend Vitest com React Testing Library.
 * Fluxo: Itera sobre os principais componentes da interface -> Valida a associação de labels -> Verifica atributos ARIA e conformidade com as diretrizes de código.
 */

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { RcaRecord } from '../../types';

// Mocks de Contexto e Hooks
vi.mock('../../context/LanguageDefinition', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        formatDate: (d: string) => d,
        language: 'pt'
    })
}));

vi.mock('../../context/RcaContext', () => ({
    useRcaContext: () => ({
        records: [],
        assets: [],
        actions: [],
        triggers: [],
        taxonomy: {
            analysisTypes: [],
            analysisStatuses: [],
            specialties: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCauseMs: [],
            triggerStatuses: []
        },
        isLoading: false,
        deleteRecord: vi.fn(),
        addAction: vi.fn(),
        updateAction: vi.fn(),
        deleteAction: vi.fn()
    })
}));

vi.mock('../../hooks/useFilterPersistence', () => ({
    useFilterPersistence: () => ({
        showFilters: true,
        setShowFilters: vi.fn(),
        filters: { searchTerm: '', year: '', months: [], status: 'ALL', area: 'ALL', equipment: 'ALL', subgroup: 'ALL', specialty: 'ALL', analysisType: 'ALL', failureMode: 'ALL', failureCategory: 'ALL', componentType: 'ALL', rootCause6M: 'ALL' },
        setFilters: vi.fn(),
        handleReset: vi.fn(),
        isGlobal: false,
        toggleGlobal: vi.fn()
    })
}));

vi.mock('../../hooks/useFilteredData', () => ({
    useFilteredData: () => ({
        filteredRCAs: [],
        filteredTriggers: [],
        filteredActions: [],
        availableOptions: {
            status: new Set(), analysisType: new Set(), specialty: new Set(), failureMode: new Set(), failureCategory: new Set(), componentType: new Set(), rootCause6M: new Set(), area: new Set(), equipment: new Set(), subgroup: new Set(), year: new Set(), months: new Set()
        },
        availableTriggerOptions: {
            status: new Set(), analysisType: new Set(), specialty: new Set(), failureMode: new Set(), failureCategory: new Set(), componentType: new Set(), rootCause6M: new Set(), area: new Set(), equipment: new Set(), subgroup: new Set(), year: new Set(), months: new Set()
        }
    })
}));

vi.mock('../../hooks/useEnterAnimation', () => ({
    useEnterAnimation: () => ({ current: null })
}));

// Componentes a serem testados
import { FilterBar } from '../layout/FilterBar';
import { ActionModal } from '../modals/ActionModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { TriggerModal } from '../triggers/TriggerModal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Step2Problem } from '../steps/Step2Problem';
import { Step3Technical } from '../steps/Step3Technical';
import { Step4Investigation } from '../steps/Step4Investigation';
import { Step5Actions } from '../steps/Step5Actions';

const mockRcaData: RcaRecord = {
    id: '123',
    what: '',
    status: 'OPEN',
    participants: [],
    version: 1,
    five_whys: [],
    ishikawa: { method: [], machine: [], manpower: [], material: [], measurement: [], environment: [] },
    root_causes: [{ id: 'rc1', root_cause_m_id: '', cause: '' }],
    containment_actions: [{ id: 'ac1', action: '', responsible: '', date: '', status: 'PENDING' }]
} as unknown as RcaRecord;

const mockTriggerData = {
    id: 'T123',
    area_id: '',
    equipment_id: '',
    subgroup_id: '',
    start_date: '',
    end_date: '',
    stop_type: '',
    stop_reason: '',
    analysis_type_id: '',
    status: '',
    responsible: '',
    comments: ''
} as any;

const mockTaxonomy = {
    componentTypes: [],
    analysisTypes: [],
    analysisStatuses: [],
    failureModes: [],
    failureCategories: [],
    specialties: [],
    rootCauseMs: [],
    triggerStatuses: []
};

describe('Acessibilidade Global - Associação de Labels', () => {
    
    describe('Componentes UI Base', () => {
        it('o componente Input deve associar o label ao input via ID único', () => {
            const testId = 'test-input';
            const labelText = 'Nome do Facilitador';
            render(<Input id={testId} label={labelText} onChange={() => {}} />);
            
            const label = screen.getByText(labelText);
            const input = screen.getByRole('textbox');
            
            expect(label.getAttribute('for')).toBe(testId);
            expect(input.getAttribute('id')).toBe(testId);
        });

        it('o componente Select deve associar o label ao select via ID único', () => {
            const testId = 'test-select';
            const labelText = 'Tipo de Análise';
            render(<Select id={testId} label={labelText} options={[]} onChange={() => {}} />);
            
            const label = screen.getByText(labelText);
            const select = screen.getByRole('combobox');
            
            expect(label.getAttribute('for')).toBe(testId);
            expect(select.getAttribute('id')).toBe(testId);
        });

        it('o componente Textarea deve associar o label ao campo via ID único', () => {
            const testId = 'test-textarea';
            const labelText = 'Descrição do Problema';
            render(<Textarea id={testId} label={labelText} onChange={() => {}} />);
            
            const label = screen.getByText(labelText);
            const textarea = screen.getByRole('textbox');
            
            expect(label.getAttribute('for')).toBe(testId);
            expect(textarea.getAttribute('id')).toBe(testId);
        });
    });

    describe('Passos do Editor (RcaEditor Steps)', () => {
        it('Step2Problem: todos os campos devem ter labels associados', () => {
            const { container } = render(
                <Step2Problem 
                    data={mockRcaData} 
                    onChange={vi.fn()} 
                    taxonomy={mockTaxonomy} 
                    isFieldRequired={() => false} 
                />
            );

            const labels = [
                'wizard.step2.who',
                'wizard.step2.when',
                'wizard.step2.where',
                'wizard.step2.what',
                'wizard.step2.potentialImpacts',
                'wizard.step2.problemDescription',
                'wizard.step2.qualityImpacts'
            ];

            labels.forEach(l => {
                const label = screen.getByText(new RegExp(l, 'i'));
                const htmlFor = label.getAttribute('for');
                expect(htmlFor).toBeTruthy();
                const element = container.querySelector(`#${htmlFor?.replace(/:/g, '\\:')}`);
                expect(element).toBeTruthy();
            });
        });

        it('Step3Technical: todos os campos devem ter labels associados', () => {
            const { container } = render(
                <Step3Technical 
                    data={mockRcaData} 
                    onChange={vi.fn()} 
                    taxonomy={mockTaxonomy} 
                    isFieldRequired={() => false} 
                />
            );

            const labels = [
                'wizard.step3.specialty',
                'wizard.step3.failureMode',
                'wizard.step3.failureCategory',
                'wizard.step3.downtimeMinutes',
                'wizard.step3.financialImpact'
            ];

            labels.forEach(l => {
                const label = screen.getByText(new RegExp(l, 'i'));
                const htmlFor = label.getAttribute('for');
                expect(htmlFor).toBeTruthy();
                const element = container.querySelector(`#${htmlFor?.replace(/:/g, '\\:')}`);
                expect(element).toBeTruthy();
            });
        });

        it('Step4Investigation: campos de Ishikawa e Causa Raiz devem ter labels', () => {
            const { container } = render(
                <Step4Investigation 
                    data={mockRcaData} 
                    onChange={vi.fn()} 
                    onAnalyzeAI={vi.fn()}
                    isAnalyzing={false}
                    taxonomy={mockTaxonomy} 
                    isFieldRequired={() => false} 
                />
            );

            const labels = [
                'wizard.step4.ishikawaSubtitle',
                'wizard.step4.addItem',
                'wizard.step4.sixMFactor',
                'wizard.step4.causeDescription'
            ];

            labels.forEach(l => {
                const label = screen.getByText(new RegExp(l, 'i'));
                const htmlFor = label.getAttribute('for');
                expect(htmlFor).toBeTruthy();
                const element = container.querySelector(`#${htmlFor?.replace(/:/g, '\\:')}`);
                expect(element).toBeTruthy();
            });
        });

        it('Step5Actions: campos de ações de contenção devem ter labels', () => {
            const { container } = render(
                <Step5Actions 
                    data={mockRcaData} 
                    onChange={vi.fn()} 
                    linkedActions={[]}
                    onAddActionPlan={vi.fn()}
                    onEditActionPlan={vi.fn()}
                    onDeleteActionPlan={vi.fn()}
                    isFieldRequired={() => false} 
                />
            );

            const labels = [
                'wizard.step5.whatAction',
                'wizard.step5.whoResponsible',
                'wizard.step5.whenDate'
            ];

            labels.forEach(l => {
                const label = screen.getByText(new RegExp(l, 'i'));
                const htmlFor = label.getAttribute('for');
                expect(htmlFor).toBeTruthy();
                const element = container.querySelector(`#${htmlFor?.replace(/:/g, '\\:')}`);
                expect(element).toBeTruthy();
            });
        });
    });

    describe('Modais do Sistema', () => {
        it('ActionModal: todos os campos devem ter labels associados', () => {
            const { container } = render(
                <ActionModal 
                    isOpen={true} 
                    onClose={vi.fn()} 
                    onSave={vi.fn()} 
                    initialData={null}
                />
            );

            const labels = [
                'actionModal.linkedAnalysis',
                'actionModal.actionDescription',
                'actionModal.responsible',
                'actionModal.dueDate',
                'actionModal.statusBox',
                'actionModal.mocNumber'
            ];

            labels.forEach(l => {
                const label = screen.getByText(new RegExp(l, 'i'));
                const htmlFor = label.getAttribute('for');
                expect(htmlFor).toBeTruthy();
                const element = container.querySelector(`#${htmlFor?.replace(/:/g, '\\:')}`);
                expect(element).toBeTruthy();
            });
        });

        it('TriggerModal: todos os campos devem ter labels associados', () => {
            const { container } = render(
                <TriggerModal 
                    editingTrigger={mockTriggerData}
                    setEditingTrigger={vi.fn()}
                    setIsModalOpen={vi.fn()}
                    handleSave={vi.fn()}
                    assets={[]}
                    taxonomy={mockTaxonomy}
                />
            );

            // Inputs e Selects padrão
            const labels = [
                'triggerModal.startDate',
                'triggerModal.endDate',
                'triggerModal.stopType',
                'triggerModal.stopReason',
                'triggerModal.analysisType',
                'triggerModal.responsible',
                'triggerModal.status',
                'triggerModal.comments'
            ];

            labels.forEach(l => {
                const label = screen.getByText(new RegExp(l, 'i'));
                const htmlFor = label.getAttribute('for');
                expect(htmlFor).toBeTruthy();
                const element = container.querySelector(`#${htmlFor?.replace(/:/g, '\\:')}`);
                expect(element).toBeTruthy();
            });

            // Seletor de Ativos (Aria-Labelledby)
            const assetLabel = screen.getByText(/wizard.step1.assetSelectorLabel/i);
            const labelId = assetLabel.getAttribute('id');
            expect(labelId).toBeTruthy();
            expect(container.querySelector(`[aria-labelledby="${labelId}"]`)).toBeTruthy();
        });

        it('ConfirmModal: deve possuir estrutura acessível', () => {
            render(
                <ConfirmModal 
                    isOpen={true}
                    message="Deseja excluir?"
                    onConfirm={vi.fn()}
                    onCancel={vi.fn()}
                />
            );

            // Verifica se o título existe (h3)
            expect(screen.getByRole('heading', { name: /common.confirm/i })).toBeTruthy();
            expect(screen.getByText('Deseja excluir?')).toBeTruthy();
            // Verifica se o botão de confirmação existe
            expect(screen.getByRole('button', { name: /common.confirm/i })).toBeTruthy();
        });
    });

    describe('Barra de Filtros (FilterBar)', () => {
        it('todos os controles de filtro devem possuir labels associados', () => {
            const mockFilters = { 
                searchTerm: '', year: '', months: [], status: 'ALL', area: 'ALL', 
                equipment: 'ALL', subgroup: 'ALL', specialty: 'ALL', analysisType: 'ALL',
                failureMode: 'ALL', failureCategory: 'ALL', componentType: 'ALL', rootCause6M: 'ALL' 
            };
            
            const { container } = render(
                <FilterBar 
                    isOpen={true} 
                    onToggle={vi.fn()} 
                    filters={mockFilters} 
                    onFilterChange={vi.fn()} 
                    onReset={vi.fn()} 
                />
            );

            const labelKeys = [
                'filters.searchLabel',
                'filters.year',
                'filters.area',
                'filters.equipment',
                'filters.subgroup',
                'filters.analysisType',
                'filters.specialty',
                'filters.status'
            ];

            labelKeys.forEach(l => {
                const label = screen.getByText(l);
                const htmlFor = label.getAttribute('for');
                expect(htmlFor).toBeTruthy();
                const element = container.querySelector(`#${htmlFor?.replace(/:/g, '\\:')}`);
                expect(element).toBeTruthy();
            });
        });
    });
});

