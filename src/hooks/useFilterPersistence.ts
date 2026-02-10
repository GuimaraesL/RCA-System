/**
 * Proposta: Hook para persistência de preferências de filtragem e estado da interface.
 * Fluxo: Gerencia a visibilidade dos painéis de filtro e os critérios de busca, permitindo a alternância entre filtros específicos por página e filtros globais sincronizados, persistindo as escolhas no LocalStorage do navegador.
 * Nota: Este arquivo interage com o LocalStorage exclusivamente para persistência de preferências de UI, não manipulando dados de negócio.
 */

import { useState, useEffect } from 'react';
import { FilterState } from '../components/FilterBar';
import { useGlobalFilters } from '../context/FilterContext';

export const useFilterPersistence = (pageKey: string, defaultFilters: FilterState, defaultOpen: boolean = true) => {
    const { isGlobal, globalFilters, setGlobalFilters, toggleGlobal: toggleGlobalContext } = useGlobalFilters();

    // 1. Persistência de Visibilidade (Expandido/Colapsado) - Sempre específico por página
    const [showFilters, setShowFilters] = useState(() => {
        try {
            const saved = localStorage.getItem(`${pageKey}_show`);
            return saved !== null ? JSON.parse(saved) : defaultOpen;
        } catch { return defaultOpen; }
    });

    // 2. Estado de Filtros Locais (Utilizado apenas quando isGlobal é FALSO)
    const [localFilters, setLocalFilters] = useState<FilterState>(() => {
        try {
            const saved = localStorage.getItem(`${pageKey}_criteria`);
            return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
        } catch { return defaultFilters; }
    });

    // --- Valores Derivados ---
    // Os filtros "ativos" dependem do modo atual (Global vs Local)
    const filters = isGlobal ? globalFilters : localFilters;

    /**
     * Atualiza os filtros e persiste no local correto (Contexto Global ou LocalStorage).
     */
    const setFilters = (newFilters: FilterState | ((prev: FilterState) => FilterState)) => {
        const value = typeof newFilters === 'function' ? newFilters(filters) : newFilters;
        
        if (isGlobal) {
            setGlobalFilters(value);
        } else {
            setLocalFilters(value);
            localStorage.setItem(`${pageKey}_criteria`, JSON.stringify(value));
        }
    };

    // --- Efeitos de Persistência ---

    // Persiste a visibilidade do painel
    useEffect(() => {
        localStorage.setItem(`${pageKey}_show`, JSON.stringify(showFilters));
    }, [showFilters, pageKey]);

    /**
     * Gerencia a alternância para o modo Global, transportando os filtros locais atuais se necessário.
     */
    const toggleGlobal = () => {
        if (!isGlobal) {
            // Ao ativar o modo Global: Transporta os filtros locais atuais para o contexto global
            setGlobalFilters(localFilters);
        }
        toggleGlobalContext();
    };

    const handleReset = (defaults: FilterState) => {
        setFilters(defaults);
    };

    return {
        showFilters, setShowFilters, filters, setFilters,
        handleReset, isGlobal, toggleGlobal
    };
};