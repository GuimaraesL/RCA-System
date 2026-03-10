/**
 * Proposta: Cabeçalho de tabela com suporte a ordenação (Sort).
 * Fluxo: Renderiza o título da coluna e ícones de direção (asc/desc), disparando eventos de ordenação ao clique.
 */

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface SortHeaderProps {
    label: string;
    sortKey: string;
    currentSort: { key: string; direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
    className?: string;
    width?: string;
}

export const SortHeader: React.FC<SortHeaderProps> = ({ label, sortKey, currentSort, onSort, className = '', width = '' }) => {
    const isActive = currentSort?.key === sortKey;

    return (
        <th 
            className={`px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group/header ${width} ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-2">
                <span className={`${isActive ? 'text-primary-600 font-bold' : 'text-slate-500'}`}>{label}</span>
                <span className={`transition-opacity ${isActive ? 'opacity-100 text-primary-500' : 'opacity-0 group-hover/header:opacity-100 text-slate-300'}`}>
                    {isActive ? (
                        currentSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                        <ArrowUpDown size={14} />
                    )}
                </span>
            </div>
        </th>
    );
};
