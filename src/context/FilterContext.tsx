
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FilterState } from '../components/FilterBar';

interface FilterContextType {
    isGlobal: boolean;
    setIsGlobal: (val: boolean) => void;
    globalFilters: FilterState;
    setGlobalFilters: (filters: FilterState) => void;
    toggleGlobal: () => void;
}

const GLOBAL_MODE_KEY = 'rca_filter_is_global';
const GLOBAL_FILTERS_KEY = 'rca_global_filters';

const defaultFilters: FilterState = {
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

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isGlobal, setIsGlobalState] = useState(() => {
        return localStorage.getItem(GLOBAL_MODE_KEY) === 'true';
    });

    const [globalFilters, setGlobalFiltersState] = useState<FilterState>(() => {
        const saved = localStorage.getItem(GLOBAL_FILTERS_KEY);
        return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    });

    const setIsGlobal = (val: boolean) => {
        setIsGlobalState(val);
        localStorage.setItem(GLOBAL_MODE_KEY, String(val));
    };

    const setGlobalFilters = (filters: FilterState) => {
        setGlobalFiltersState(filters);
        localStorage.setItem(GLOBAL_FILTERS_KEY, JSON.stringify(filters));
    };

    const toggleGlobal = () => {
        const newState = !isGlobal;
        setIsGlobal(newState);
    };

    // Listen for storage events (Sync across tabs)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === GLOBAL_FILTERS_KEY && e.newValue) {
                setGlobalFiltersState(JSON.parse(e.newValue));
            }
            if (e.key === GLOBAL_MODE_KEY) {
                setIsGlobalState(e.newValue === 'true');
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return (
        <FilterContext.Provider value={{ isGlobal, setIsGlobal, globalFilters, setGlobalFilters, toggleGlobal }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useGlobalFilters = () => {
    const context = useContext(FilterContext);
    if (!context) throw new Error('useGlobalFilters must be used within FilterProvider');
    return context;
};
