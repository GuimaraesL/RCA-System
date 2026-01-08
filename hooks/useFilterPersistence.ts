
import { useState, useEffect } from 'react';
import { FilterState } from '../components/FilterBar';

const GLOBAL_MODE_KEY = 'rca_filter_is_global';
const GLOBAL_FILTERS_KEY = 'rca_global_filters';

export const useFilterPersistence = (pageKey: string, defaultFilters: FilterState, defaultOpen: boolean = true) => {
    // 1. Persistence for visibility (Expanded/Collapsed)
    const [showFilters, setShowFilters] = useState(() => {
        try {
            const saved = localStorage.getItem(`${pageKey}_show`);
            return saved !== null ? JSON.parse(saved) : defaultOpen;
        } catch { return defaultOpen; }
    });

    // 2. Global Mode State (Shared across the app)
    const [isGlobal, setIsGlobalState] = useState(() => {
        try {
            return localStorage.getItem(GLOBAL_MODE_KEY) === 'true';
        } catch { return false; }
    });

    // 3. Filter Values State
    const [filters, setFilters] = useState<FilterState>(() => {
        try {
            // Determine source: Global Key or Page Specific Key
            const globalMode = localStorage.getItem(GLOBAL_MODE_KEY) === 'true';
            const sourceKey = globalMode ? GLOBAL_FILTERS_KEY : `${pageKey}_criteria`;
            
            const saved = localStorage.getItem(sourceKey);
            if (saved) {
                // Merge saved filters with defaults to ensure all fields exist (migration safety)
                return { ...defaultFilters, ...JSON.parse(saved) };
            }
            return defaultFilters;
        } catch { return defaultFilters; }
    });

    // --- Effects ---

    // Persist Visibility
    useEffect(() => {
        localStorage.setItem(`${pageKey}_show`, JSON.stringify(showFilters));
    }, [showFilters, pageKey]);

    // Persist Filters (Sensitive to Global Mode)
    useEffect(() => {
        const targetKey = isGlobal ? GLOBAL_FILTERS_KEY : `${pageKey}_criteria`;
        localStorage.setItem(targetKey, JSON.stringify(filters));
    }, [filters, isGlobal, pageKey]);

    // --- Handlers ---

    const toggleGlobal = () => {
        const newGlobalState = !isGlobal;
        setIsGlobalState(newGlobalState);
        localStorage.setItem(GLOBAL_MODE_KEY, String(newGlobalState));

        // When switching modes, immediately load the data from that mode's storage
        // This ensures if I switch to Global, I see what was set on Dashboard, not what was on Actions
        const sourceKey = newGlobalState ? GLOBAL_FILTERS_KEY : `${pageKey}_criteria`;
        const saved = localStorage.getItem(sourceKey);
        
        if (saved) {
            setFilters({ ...defaultFilters, ...JSON.parse(saved) });
        } else {
            // If switching to a mode that has no data yet, keep current or reset? 
            // Better to keep current filters as a starting point for the new mode if it's empty
            if (newGlobalState) {
                // Switching to Global for the first time? Carry over current page filters
                localStorage.setItem(GLOBAL_FILTERS_KEY, JSON.stringify(filters));
            } else {
                setFilters(defaultFilters);
            }
        }
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
