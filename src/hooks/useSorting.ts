import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
    key: keyof T | string;
    direction: SortDirection;
}

export function useSorting<T>(items: T[], initialConfig: SortConfig<T> = { key: '', direction: 'asc' }) {
    const [sortConfig, setSortConfig] = useState<SortConfig<T>>(initialConfig);

    const handleSort = (key: keyof T | string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedItems = useMemo(() => {
        if (!items) return [];
        const sortableItems = [...items];
        if (!sortConfig.key) return sortableItems;

        return sortableItems.sort((a, b) => {
            const { key, direction } = sortConfig;

            // Nested property access (e.g. 'root_causes.length' or 'taxonomy.name')
            // For now, we assume direct access or simple string keys. 
            // If key is a string like "nested.prop", we might need lodash.get or split.
            // Let's keep it simple: access as is, assuming flat or handled by caller mapper?
            // Actually, for complex tables we often sort by computed values.
            // But usually we pass "Record" objects.

            let valA: any = (a as any)[key];
            let valB: any = (b as any)[key];

            // Special Handling (Case Insensitive for Strings)
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            // Handle Null/Undefined/Zero
            if (valA === valB) return 0;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

    }, [items, sortConfig]);

    return { sortedItems, sortConfig, handleSort };
}
