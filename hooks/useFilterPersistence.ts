import { useState, useEffect } from 'react';
import { FilterState } from '../components/FilterBar';

export const useFilterPersistence = (key: string, defaultFilters: FilterState, defaultOpen: boolean = true) => {
    // Persist Visibility (Open/Closed)
    const [showFilters, setShowFilters] = useState(() => {
        try {
            const saved = localStorage.getItem(`${key}_show`);
            return saved !== null ? JSON.parse(saved) : defaultOpen;
        } catch { return defaultOpen; }
    });

    // Persist Criteria values
    const [filters, setFilters] = useState<FilterState>(() => {
         try {
            const saved = localStorage.getItem(`${key}_criteria`);
            return saved ? JSON.parse(saved) : defaultFilters;
         } catch { return defaultFilters; }
    });

    useEffect(() => {
        localStorage.setItem(`${key}_show`, JSON.stringify(showFilters));
    }, [showFilters, key]);

    useEffect(() => {
        localStorage.setItem(`${key}_criteria`, JSON.stringify(filters));
    }, [filters, key]);

    const handleReset = (defaults: FilterState) => {
        setFilters(defaults);
    };

    return { showFilters, setShowFilters, filters, setFilters, handleReset };
};
