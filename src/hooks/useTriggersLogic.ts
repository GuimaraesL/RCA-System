/**
 * Proposta: Hook para orquestração da lógica de Gatilhos (Triggers) de parada.
 * Fluxo: Centraliza a gestão de estado para listagem, modais de vinculação com RCA, filtros persistentes e orquestração de operações CRUD através do contexto global.
 */

import { useState, useMemo } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { TriggerRecord, AssetNode } from '../types';
import { useFilterPersistence } from './useFilterPersistence';
import { useSorting } from './useSorting';
import { filterAssetsByUsage } from '../services/utils';
import { FilterState } from '../components/FilterBar';
import { useFilteredData } from './useFilteredData';

export const useTriggersLogic = () => {
    const { triggers, assets, taxonomy, records, addTrigger, updateTrigger, deleteTrigger } = useRcaContext();

    // --- Gestão de Estado de Modais ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState<TriggerRecord | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [triggerToDelete, setTriggerToDelete] = useState<string | null>(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [triggerToLink, setTriggerToLink] = useState<TriggerRecord | null>(null);

    // Gestão de Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    // --- Configuração de Filtros Persistentes ---
    const defaultFilters: FilterState = {
        searchTerm: '', year: '', months: [], status: 'ALL', area: 'ALL',
        equipment: 'ALL', subgroup: 'ALL', specialty: 'ALL', analysisType: 'ALL',
        failureMode: 'ALL', failureCategory: 'ALL', componentType: 'ALL', rootCause6M: 'ALL'
    };

    const { showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal } = useFilterPersistence(
        'rca_triggers_view_v1',
        defaultFilters,
        true
    );

    // Hook de filtragem inteligente (Cross-Filtering)
    const { filteredTriggers: filteredContent } = useFilteredData(filters);

    /**
     * Define as opções dinâmicas para os seletores de filtros, baseando-se na taxonomia e nos ativos em uso.
     */
    const dynamicOptions = useMemo(() => {
        return {
            assets: filterAssetsByUsage(assets, new Set()),
            statuses: taxonomy.triggerStatuses || [],
            analysisTypes: taxonomy.analysisTypes || []
        };
    }, [assets, taxonomy]);

    // Lógica de ordenação de dados
    const { sortedItems: filteredTriggers, sortConfig, handleSort } = useSorting(filteredContent, { key: 'start_date', direction: 'desc' });

    return {
        triggers, assets, taxonomy, records,
        addTrigger, updateTrigger, deleteTrigger,
        isModalOpen, setIsModalOpen,
        editingTrigger, setEditingTrigger,
        deleteModalOpen, setDeleteModalOpen,
        triggerToDelete, setTriggerToDelete,
        linkModalOpen, setLinkModalOpen,
        triggerToLink, setTriggerToLink,
        currentPage, setCurrentPage, itemsPerPage,
        showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal,
        dynamicOptions,
        filteredTriggers,
        sortConfig, handleSort
    };
};