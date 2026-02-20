/**
 * Teste: useFilteredData.test.tsx
 * 
 * Proposta: Validar a lógica de filtragem cruzada e a geração dinâmica de opções de filtro (availableOptions).
 * Ações: Renderização do hook com dados mockados e aplicação de diferentes combinações de filtros (Área, Status, etc.).
 * Execução: Frontend Vitest.
 * Fluxo: Configuração de registros de teste -> Aplicação de filtros via hook -> Verificação da redução do conjunto de dados e atualização das opções de filtro disponíveis no dashboard.
 */

import { renderHook } from '@testing-library/react';
import { useFilteredData } from '../useFilteredData';
import { vi, describe, it, expect } from 'vitest';

// Mock das dependências
const mockRecords = [
    {
        id: '1',
        what: 'Análise 1',
        status: 'OPEN',
        area_id: 'AREA_1',
        equipment_id: 'EQ_1',
        analysis_type: 'TYPE_A',
        failure_date: '2023-01-01'
    },
    {
        id: '2',
        what: 'Análise 2',
        status: 'CLOSED',
        area_id: 'AREA_2',
        equipment_id: 'EQ_2',
        analysis_type: 'TYPE_B',
        failure_date: '2023-02-01'
    },
    {
        id: '3',
        what: 'Análise 3',
        status: 'OPEN',
        area_id: 'AREA_1',
        equipment_id: 'EQ_3',
        analysis_type: 'TYPE_A',
        failure_date: '2023-01-15'
    }
];

vi.mock('../../context/RcaContext', () => ({
    useRcaContext: () => ({
        records: mockRecords,
        triggers: [
            {
                id: 'T1',
                stop_reason: 'Falha Crítica',
                area_id: 'AREA_1',
                status: 'OPEN',
                start_date: '2023-01-05'
            },
            {
                id: 'T2',
                stop_reason: 'Manutenção',
                area_id: 'AREA_2',
                status: 'CLOSED',
                start_date: '2023-05-10'
            }
        ],
        assets: []
    })
}));

vi.mock('../useActionsLogic', () => ({
    useActionsLogic: () => ({
        actions: [
            {
                id: 'ACT1',
                action: 'Reparar motor',
                searchContext: 'reparar motor responsavel 1 analise 1',
                status: 'OPEN',
                areaId: 'AREA_1',
                yearStr: '2023',
                monthStr: '01'
            }
        ]
    })
}));

describe('useFilteredData', () => {
    it('deve retornar todas as opções quando nenhum filtro (exceto ALL) estiver aplicado', () => {
        const filters = {
            searchTerm: '',
            year: '',
            months: [],
            status: 'ALL',
            area: 'ALL',
            equipment: 'ALL',
            subgroup: 'ALL',
            specialty: 'ALL',
            analysisType: 'ALL',
            failureMode: 'ALL',
            failureCategory: 'ALL',
            componentType: 'ALL',
            rootCause6M: 'ALL'
        };

        const { result } = renderHook(() => useFilteredData(filters));

        expect(result.current.filteredRCAs).toHaveLength(3);
        expect(result.current.availableOptions.status.has('OPEN')).toBe(true);
        expect(result.current.availableOptions.status.has('CLOSED')).toBe(true);
        expect(result.current.availableOptions.area.has('AREA_1')).toBe(true);
        expect(result.current.availableOptions.area.has('AREA_2')).toBe(true);
    });

    it('deve restringir as opções disponíveis com base nos filtros ativos', () => {
        const filters = {
            searchTerm: '',
            year: '',
            months: [],
            status: 'ALL',
            area: 'AREA_1', // Filtrar por Área 1
            equipment: 'ALL',
            subgroup: 'ALL',
            specialty: 'ALL',
            analysisType: 'ALL',
            failureMode: 'ALL',
            failureCategory: 'ALL',
            componentType: 'ALL',
            rootCause6M: 'ALL'
        };

        const { result } = renderHook(() => useFilteredData(filters));

        // Deve retornar apenas Análise 1 e 3
        expect(result.current.filteredRCAs).toHaveLength(2);

        // AREA_1 possui apenas status OPEN (Análise 1 e 3)
        expect(result.current.availableOptions.status.has('OPEN')).toBe(true);
        expect(result.current.availableOptions.status.has('CLOSED')).toBe(false); // CLOSED está na AREA_2

        // AREA_1 possui apenas TYPE_A
        expect(result.current.availableOptions.analysisType.has('TYPE_A')).toBe(true);
        expect(result.current.availableOptions.analysisType.has('TYPE_B')).toBe(false); // TYPE_B está na AREA_2
    });

    it('deve restringir as opções disponíveis com base no filtro de status', () => {
        const filters = {
            searchTerm: '',
            year: '',
            months: [],
            status: 'CLOSED', // Filtrar por Fechado
            area: 'ALL',
            equipment: 'ALL',
            subgroup: 'ALL',
            specialty: 'ALL',
            analysisType: 'ALL',
            failureMode: 'ALL',
            failureCategory: 'ALL',
            componentType: 'ALL',
            rootCause6M: 'ALL'
        };

        const { result } = renderHook(() => useFilteredData(filters));

        // Deve retornar apenas Análise 2
        expect(result.current.filteredRCAs).toHaveLength(1);

        // CLOSED existe apenas na AREA_2
        expect(result.current.availableOptions.area.has('AREA_2')).toBe(true);
        expect(result.current.availableOptions.area.has('AREA_1')).toBe(false);
    });

    it('deve filtrar Gatilhos (Triggers) corretamente', () => {
        const filters = {
            searchTerm: 'Falha',
            year: '',
            months: [],
            status: 'ALL',
            area: 'ALL',
            equipment: 'ALL',
            subgroup: 'ALL',
            specialty: 'ALL',
            analysisType: 'ALL',
            failureMode: 'ALL',
            failureCategory: 'ALL',
            componentType: 'ALL',
            rootCause6M: 'ALL'
        };

        const { result } = renderHook(() => useFilteredData(filters));

        expect(result.current.filteredTriggers).toHaveLength(1);
        expect(result.current.filteredTriggers[0].id).toBe('T1');
    });

    it('deve filtrar Ações (Actions) corretamente', () => {
        const filters = {
            searchTerm: 'reparar',
            year: '2023',
            months: ['01'],
            status: 'OPEN',
            area: 'AREA_1',
            equipment: 'ALL',
            subgroup: 'ALL',
            specialty: 'ALL',
            analysisType: 'ALL',
            failureMode: 'ALL',
            failureCategory: 'ALL',
            componentType: 'ALL',
            rootCause6M: 'ALL'
        };

        const { result } = renderHook(() => useFilteredData(filters));

        expect(result.current.filteredActions).toHaveLength(1);
        expect(result.current.filteredActions[0].id).toBe('ACT1');
    });

    it('deve suportar busca normalizada (sem acentos)', () => {
        const filters = {
            searchTerm: 'Analise', // Procura por "Análise"
            year: '',
            months: [],
            status: 'ALL',
            area: 'ALL',
            equipment: 'ALL',
            subgroup: 'ALL',
            specialty: 'ALL',
            analysisType: 'ALL',
            failureMode: 'ALL',
            failureCategory: 'ALL',
            componentType: 'ALL',
            rootCause6M: 'ALL'
        };

        const { result } = renderHook(() => useFilteredData(filters));

        // Todas as 3 análises possuem a palavra "Análise" no what
        expect(result.current.filteredRCAs).toHaveLength(3);
    });

    it('deve gerar opções disponíveis para Gatilhos (availableTriggerOptions)', () => {
        const filters = {
            searchTerm: '',
            year: '',
            months: [],
            status: 'ALL',
            area: 'ALL',
            equipment: 'ALL',
            subgroup: 'ALL',
            specialty: 'ALL',
            analysisType: 'ALL',
            failureMode: 'ALL',
            failureCategory: 'ALL',
            componentType: 'ALL',
            rootCause6M: 'ALL'
        };

        const { result } = renderHook(() => useFilteredData(filters));

        expect(result.current.availableTriggerOptions.status.has('OPEN')).toBe(true);
        expect(result.current.availableTriggerOptions.status.has('CLOSED')).toBe(true);
        expect(result.current.availableTriggerOptions.area.has('AREA_1')).toBe(true);
        expect(result.current.availableTriggerOptions.area.has('AREA_2')).toBe(true);
    });
});
