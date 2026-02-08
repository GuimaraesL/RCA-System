// [ALLOWED-USAGE] This file interacts with localStorage solely for UI preference persistence (filters, view modes).
// It does NOT handle business data (Records, Assets, etc.).
import { useState, useEffect } from 'react';
import { FilterState } from '../components/FilterBar';
import { useGlobalFilters } from '../context/FilterContext';

export const useFilterPersistence = (pageKey: string, defaultFilters: FilterState, defaultOpen: boolean = true) => {
    const { isGlobal, globalFilters, setGlobalFilters, toggleGlobal: toggleGlobalContext } = useGlobalFilters();

    // 1. Persistence for visibility (Expanded/Collapsed) - Always Page Specific
    const [showFilters, setShowFilters] = useState(() => {
        try {
            const saved = localStorage.getItem(`${pageKey}_show`);
            return saved !== null ? JSON.parse(saved) : defaultOpen;
        } catch { return defaultOpen; }
    });

    // 2. Local Filter Values State (Used only when isGlobal is FALSE)
    const [localFilters, setLocalFilters] = useState<FilterState>(() => {
        try {
            const saved = localStorage.getItem(`${pageKey}_criteria`);
            return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
        } catch { return defaultFilters; }
    });

    // --- Derived Values ---
    // The "live" filters depend on the current mode
    const filters = isGlobal ? globalFilters : localFilters;

    const setFilters = (newFilters: FilterState | ((prev: FilterState) => FilterState)) => {
        const value = typeof newFilters === 'function' ? newFilters(filters) : newFilters;
        
        if (isGlobal) {
            setGlobalFilters(value);
        } else {
            setLocalFilters(value);
            localStorage.setItem(`${pageKey}_criteria`, JSON.stringify(value));
        }
    };

    // --- Effects ---

    // Persist Visibility
    useEffect(() => {
        localStorage.setItem(`${pageKey}_show`, JSON.stringify(showFilters));
    }, [showFilters, pageKey]);

    // Handle Global Toggle with data carry-over
    const toggleGlobal = () => {
        if (!isGlobal) {
            // Turning Global ON: Carry current local filters to global
            setGlobalFilters(localFilters);
        }
        toggleGlobalContext();
    };

    const handleReset = (defaults: FilterState) => {
        setFilters(defaults);
    };

    return {
        showFilters,
        setShowFilters,
        filters,
        setFilters,
        handleReset,
        isGlobal,
        toggleGlobal
    };
};
