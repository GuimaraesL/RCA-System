/**
 * Proposta: Teste de Acessibilidade para o Passo 1 do Wizard RCA.
 * Fluxo: Renderiza o componente Step1General e verifica se todos os inputs possuem labels associados corretamente, garantindo conformidade com WCAG.
 */

import { render, screen } from '@testing-library/react';
import { Step1General } from '../steps/Step1General';
import { vi, describe, it, expect } from 'vitest';
import { RcaRecord } from '../../types';

// Mock das dependências
const mockData: RcaRecord = {
    id: '123',
    what: '',
    status: 'OPEN',
    participants: [],
    version: 1,
    // campos do passo 1
    subgroup_id: '',
    component_type: '',
    failure_date: '',
    failure_time: '',
    os_number: '',
    analysis_type: '',
    facilitator: '',
    analysis_duration_minutes: 0,
    start_date: '',
    completion_date: '',
    requires_operation_support: false
} as unknown as RcaRecord;

const mockTaxonomy = {
    componentTypes: [{ id: 'CT1', name: 'Tipo 1' }],
    analysisTypes: [{ id: 'AT1', name: 'Tipo A' }],
    analysisStatuses: [],
    failureModes: [],
    failureCategories: [],
    specialties: [],
    rootCauseMs: [],
    triggerStatuses: []
};

vi.mock('../../context/LanguageDefinition', () => ({
    useLanguage: () => ({
        t: (key: string) => key, // Retorna a chave como tradução para facilitar a busca
    })
}));

describe('Acessibilidade do Step1General', () => {
    it('todos os inputs devem ter um label associado', () => {
        render(
            <Step1General
                data={mockData}
                onChange={vi.fn()}
                assets={[]}
                taxonomy={mockTaxonomy}
                onAssetSelect={vi.fn()}
                onRefreshAssets={vi.fn()}
                errors={{}}
                isFieldRequired={() => false}
            />
        );

        // Lista de campos esperados pelo label (chaves de tradução ou texto visível)
        const expectedLabels = [
            'wizard.step1.componentType',
            'wizard.step1.failureDate',
            'wizard.step1.failureTime',
            'wizard.step1.osNumber',
            'wizard.step1.analysisType',
            'wizard.step1.facilitator',
            'wizard.step1.analysisDuration',
            'wizard.step1.participants',
            'wizard.step1.startDate',
            'wizard.step1.completionDate',
            'wizard.step1.requiresOperation'
        ];

        expectedLabels.forEach(labelText => {
            const label = screen.getByText(labelText);
            expect(label).toBeTruthy();
            
            // Verifica se o label tem o atributo 'for' (no DOM é 'htmlFor')
            const htmlFor = label.getAttribute('for');
            expect(htmlFor).toBeTruthy();

            // Verifica se existe um input com esse id
            if (htmlFor) {
                const input = document.getElementById(htmlFor);
                expect(input).toBeTruthy();
            }
        });
    });

    it('o seletor de ativos deve ter um label descritivo', () => {
        render(
            <Step1General
                data={mockData}
                onChange={vi.fn()}
                assets={[]}
                taxonomy={mockTaxonomy}
                onAssetSelect={vi.fn()}
                onRefreshAssets={vi.fn()}
                errors={{}}
                isFieldRequired={() => false}
            />
        );

        const assetLabel = screen.getByText(/wizard.step1.assetSelectorLabel/i);
        expect(assetLabel).toBeTruthy();
        
        // Verifica se o container ou input associado existe e é acessível via aria-labelledby
        const labelId = assetLabel.getAttribute('id');
        expect(labelId).toBeTruthy();
        
        if (labelId) {
            const container = document.querySelector(`[aria-labelledby="${labelId}"]`);
            expect(container).toBeTruthy();
        }
    });
});