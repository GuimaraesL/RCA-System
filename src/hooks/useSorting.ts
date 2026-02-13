/**
 * Proposta: Hook genérico para ordenação de listas de objetos.
 * Fluxo: Gerencia a chave ativa e a direção da ordenação, provendo uma lista memorizada e ordenada baseada em comparações resilientes a tipos (strings, números, datas e valores nulos).
 */

import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
    key: string;
    direction: SortDirection;
}

export function useSorting<T>(items: T[], initialConfig: SortConfig<T> = { key: '', direction: 'asc' }) {
    const [sortConfig, setSortConfig] = useState<SortConfig<T>>(initialConfig);

    /**
     * Alterna a ordenação de uma coluna. 
     * Se a coluna já estiver ativa, inverte a direção; caso contrário, define-a como ascendente.
     */
    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    /**
     * Retorna a lista ordenada.
     * Implementa tratamento de caixa alta/baixa para strings e priorização de valores nulos/indefinidos no final da lista.
     */
    const sortedItems = useMemo(() => {
        if (!items) return [];
        const sortableItems = [...items];
        if (!sortConfig.key) return sortableItems;

        return sortableItems.sort((a, b) => {
            const { key, direction } = sortConfig;

            let valA: any = (a as any)[key];
            let valB: any = (b as any)[key];

            // Normalização para comparação insensível a caixa
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            // Tratamento de igualdade e valores nulos (Null/Undefined)
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