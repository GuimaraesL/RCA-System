/**
 * Proposta: Testes unitários para o hook useFilteredData.
 * Fluxo: Valida a lógica de filtragem cruzada e a geração de opções disponíveis (availableOptions) com base nos critérios selecionados.
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
        triggers: [],
        assets: []
    })
}));

vi.mock('../useActionsLogic', () => ({
    useActionsLogic: () => ({
        actions: []
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
});
