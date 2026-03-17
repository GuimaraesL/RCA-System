import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { DnaMatrix } from '../DnaMatrix';
import { fetchRecordById } from '../../../services/apiService';

// Mock do fetchRecordById
vi.mock('../../../services/apiService', () => ({
    fetchRecordById: vi.fn()
}));

// Mock do Contexto de Linguagem
vi.mock('../../../context/LanguageDefinition', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
    })
}));

const mockCurrentRca: any = {
    id: 'current-123',
    what: 'Falha Atual',
    asset_name_display: 'Equipamento Atual',
    root_causes: [{ id: 'rc1', cause: 'Causa 1' }],
    ishikawa: { machine: ['Manutenção'] }
};

describe('DnaMatrix Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('deve exibir carregamento e depois dados da API', async () => {
        const mockApiRca: any = {
            id: 'recurrence-456',
            what: '', // Campo vazio na API para testar fallback
            problem_description: 'Desc',
            root_causes: [{ id: 'arc1', cause: 'Causa API' }],
            ishikawa: {},
            asset_name_display: '' // Campo vazio na API para testar fallback
        };
        
        vi.mocked(fetchRecordById).mockResolvedValue(mockApiRca);

        const mockRecurrenceInfo: any = {
            rca_id: 'recurrence-456',
            title: 'Título vindo do RAG',
            level: 'subgroup',
            equipment_name: 'Equipamento RAG'
        };

        render(
            <DnaMatrix 
                currentRca={mockCurrentRca} 
                recurrence={mockRecurrenceInfo} 
                onClose={() => {}} 
            />
        );

        // Verifica se o título vindo do RAG (fallback) apareceu na tela
        await waitFor(() => {
            const element = screen.queryByText('Título vindo do RAG');
            expect(element).toBeTruthy();
        }, { timeout: 5000 });

        // Verifica se o ativo vindo do RAG (fallback) apareceu na tela
        expect(screen.queryByText('Equipamento RAG')).toBeTruthy();
        expect(fetchRecordById).toHaveBeenCalledWith('recurrence-456');
    });

    it('deve carregar do localStorage', async () => {
        const localRca = { 
            id: 'recurrence-456', 
            what: 'Dados do Local', 
            asset_name_display: 'Equip',
            root_causes: [],
            ishikawa: {} 
        };
        localStorage.setItem('rca_app_v1_records', JSON.stringify([localRca]));

        const mockRecurrenceInfo: any = {
            rca_id: 'recurrence-456',
            title: 'Rec',
            level: 'subgroup'
        };

        render(
            <DnaMatrix 
                currentRca={mockCurrentRca} 
                recurrence={mockRecurrenceInfo} 
                onClose={() => {}} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Dados do Local')).toBeTruthy();
        }, { timeout: 3000 });

        expect(fetchRecordById).not.toHaveBeenCalled();
    });
});
