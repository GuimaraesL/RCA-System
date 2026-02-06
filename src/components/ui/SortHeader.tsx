import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortConfig } from '../../hooks/useSorting';

interface SortHeaderProps<T> {
    label: string;
    sortKey: string;
    currentSort: SortConfig<T>;
    onSort: (key: string) => void;
    width?: string;
    className?: string;
}

export function SortHeader<T>({ label, sortKey, currentSort, onSort, width, className }: SortHeaderProps<T>) {
    const isActive = currentSort.key === sortKey;

    return (
        <th
            className={`px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none group ${width || ''} ${className || ''}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
                {label}
                {isActive ? (
                    currentSort.direction === 'asc' ?
                        <ArrowUp size={14} className="text-blue-500" /> :
                        <ArrowDown size={14} className="text-blue-500" />
                ) : (
                    <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </div>
        </th>
    );
}
