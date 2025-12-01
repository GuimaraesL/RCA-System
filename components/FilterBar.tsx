
import React from 'react';
import { Search, Filter, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

export interface FilterState {
    searchTerm: string;
    dateStart: string;
    dateEnd: string;
    status: string;
    area: string;
    category: string;
}

export interface FilterOption {
    id: string;
    name: string;
}

interface FilterBarProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    onReset: () => void;
    config?: {
        showSearch?: boolean;
        showDate?: boolean;
        showStatus?: boolean;
        showArea?: boolean;
        showCategory?: boolean;
        searchPlaceholder?: string;
        dateLabel?: string;
    };
    options?: {
        statuses?: FilterOption[];
        areas?: FilterOption[];
        categories?: FilterOption[];
    };
    isOpen: boolean;
    onToggle: () => void;
    totalResults?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
    filters, 
    onFilterChange, 
    onReset, 
    config, 
    options,
    isOpen,
    onToggle,
    totalResults
}) => {
    // Defaults
    const {
        showSearch = true,
        showDate = true,
        showStatus = true,
        showArea = false,
        showCategory = false,
        searchPlaceholder = "Search...",
        dateLabel = "Date Range"
    } = config || {};

    const {
        statuses = [],
        areas = [],
        categories = []
    } = options || {};

    const handleChange = (key: keyof FilterState, value: string) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="mb-6 flex-shrink-0">
            {/* Toolbar Trigger */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onToggle} 
                        className={`text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Filter size={16} />
                        {isOpen ? 'Hide Filters' : 'Show Filters'}
                        {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                    {(filters.searchTerm || filters.status !== 'ALL' || filters.area !== 'ALL' || filters.category !== 'ALL' || filters.dateStart) && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Active</span>
                    )}
                </div>
                {totalResults !== undefined && (
                    <div className="text-sm text-slate-500">
                        Showing <strong>{totalResults}</strong> records
                    </div>
                )}
            </div>

            {/* Filter Panel Container */}
            <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2 border-0'}`}>
                {/* 
                   Inner Scroll Container: 
                   - max-h-[60vh]: Prevents the filter from taking more than 60% of viewport height.
                   - overflow-y-auto: Enables internal scrolling if content exceeds max-height.
                */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filter Criteria</h3>
                            <button onClick={onReset} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                                <RefreshCw size={12} /> Reset All
                            </button>
                        </div>
                        
                        {/* Layout: Grid 12 Columns */}
                        <div className="grid grid-cols-12 gap-6">
                            {/* Search: 4/12 */}
                            {showSearch && (
                                <div className="col-span-12 lg:col-span-4">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Keywords</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder={searchPlaceholder} 
                                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={filters.searchTerm}
                                            onChange={e => handleChange('searchTerm', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Date: 4/12 */}
                            {showDate && (
                                <div className="col-span-12 lg:col-span-4">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">{dateLabel}</label>
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="date" 
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                                            value={filters.dateStart} 
                                            onChange={e => handleChange('dateStart', e.target.value)} 
                                        />
                                        <span className="text-slate-300 font-bold">-</span>
                                        <input 
                                            type="date" 
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                                            value={filters.dateEnd} 
                                            onChange={e => handleChange('dateEnd', e.target.value)} 
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Status: 4/12 */}
                            {showStatus && (
                                <div className="col-span-12 md:col-span-6 lg:col-span-4">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={filters.status}
                                        onChange={e => handleChange('status', e.target.value)}
                                    >
                                        <option value="ALL">All Statuses</option>
                                        {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Area: 6/12 */}
                            {showArea && (
                                <div className="col-span-12 md:col-span-6 lg:col-span-6">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Area</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={filters.area}
                                        onChange={e => handleChange('area', e.target.value)}
                                    >
                                        <option value="ALL">All Areas</option>
                                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Category: 6/12 */}
                            {showCategory && (
                                <div className="col-span-12 md:col-span-6 lg:col-span-6">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Failure Category</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={filters.category}
                                        onChange={e => handleChange('category', e.target.value)}
                                    >
                                        <option value="ALL">All Categories</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
