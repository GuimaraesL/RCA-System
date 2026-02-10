
import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ChevronUp, ChevronDown, Calendar, X, MapPin, Tag, Globe, Lock } from 'lucide-react';
import { AssetNode } from '../types';
import { useLanguage } from '../context/LanguageDefinition'; // i18n
import { translateStatus, translate6M } from '../utils/statusUtils';

export interface FilterState {
    searchTerm: string;
    year: string;
    months: string[];
    status: string;
    area: string;
    equipment: string;
    subgroup: string;
    specialty: string;
    analysisType: string;
    // New fields for extensive cross-filtering
    failureMode: string;
    failureCategory: string;
    componentType: string;
    rootCause6M: string;
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
        showAssetHierarchy?: boolean;
        showDate?: boolean;
        showStatus?: boolean;
        showSpecialty?: boolean;
        showAnalysisType?: boolean;
        showComponentType?: boolean;
    };
    options?: {
        statuses?: FilterOption[];
        specialties?: FilterOption[];
        analysisTypes?: FilterOption[];
        assets?: AssetNode[];
        rootCause6Ms?: FilterOption[];
        failureModes?: FilterOption[];
        failureCategories?: FilterOption[];
        componentTypes?: FilterOption[];
    };
    isOpen: boolean;
    onToggle: () => void;
    totalResults?: number;
    // Global Filter Props
    isGlobal?: boolean;
    onGlobalToggle?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    filters,
    onFilterChange,
    onReset,
    config,
    options,
    isOpen,
    onToggle,
    totalResults,
    isGlobal,
    onGlobalToggle
}) => {
    const { t } = useLanguage();

    // --- Debounced Search State (Fix: Issue #11 - Performance com 16k registros) ---
    const [localSearch, setLocalSearch] = useState(filters.searchTerm);

    // Debounce: propaga searchTerm após 300ms sem digitação
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== filters.searchTerm) {
                onFilterChange({ ...filters, searchTerm: localSearch });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearch]);

    // Sincroniza quando filtros externos mudam (ex: reset)
    useEffect(() => {
        setLocalSearch(filters.searchTerm);
    }, [filters.searchTerm]);

    const {
        showSearch = true,
        showAssetHierarchy = true,
        showDate = true,
        showStatus = true,
        showSpecialty = true,
        showAnalysisType = true,
        showComponentType = false,
    } = config || {};

    const {
        statuses = [],
        specialties = [],
        analysisTypes = [],
        assets = [],
        rootCause6Ms = [],
        failureModes = [],
        failureCategories = [],
        componentTypes = []
    } = options || {};

    const handleChange = (key: keyof FilterState, value: any) => {
        if (key === 'area') {
            onFilterChange({ ...filters, area: value, equipment: 'ALL', subgroup: 'ALL' });
        } else if (key === 'equipment') {
            onFilterChange({ ...filters, equipment: value, subgroup: 'ALL' });
        } else {
            onFilterChange({ ...filters, [key]: value });
        }
    };

    const toggleMonth = (m: string) => {
        const current = filters.months || [];
        if (current.includes(m)) {
            handleChange('months', current.filter(x => x !== m));
        } else {
            handleChange('months', [...current, m]);
        }
    };

    // --- Derived Data ---
    const areas = useMemo(() => assets.filter(n => n.type === 'AREA'), [assets]);

    const equipments = useMemo(() => {
        if (filters.area === 'ALL') return [];
        const areaNode = assets.find(n => n.id === filters.area);
        return areaNode?.children?.filter(n => n.type === 'EQUIPMENT') || [];
    }, [assets, filters.area]);

    const subgroups = useMemo(() => {
        if (filters.equipment === 'ALL') return [];
        const areaNode = assets.find(n => n.id === filters.area);
        const eqNode = areaNode?.children?.find(n => n.id === filters.equipment);
        return eqNode?.children?.filter(n => n.type === 'SUBGROUP') || [];
    }, [assets, filters.area, filters.equipment]);

    const years = ['2023', '2024', '2025', '2026'];
    const monthsList = [
        { id: '01', label: t('filters.monthsList.jan') }, { id: '02', label: t('filters.monthsList.feb') }, { id: '03', label: t('filters.monthsList.mar') },
        { id: '04', label: t('filters.monthsList.apr') }, { id: '05', label: t('filters.monthsList.may') }, { id: '06', label: t('filters.monthsList.jun') },
        { id: '07', label: t('filters.monthsList.jul') }, { id: '08', label: t('filters.monthsList.aug') }, { id: '09', label: t('filters.monthsList.sep') },
        { id: '10', label: t('filters.monthsList.oct') }, { id: '11', label: t('filters.monthsList.nov') }, { id: '12', label: t('filters.monthsList.dec') },
    ];

    // Helper to resolve names for chips
    const findAssetNameRecursive = (id: string, list: AssetNode[]): string => {
        for (const item of list) {
            if (item.id === id) return item.name;
            if (item.children) {
                const found = findAssetNameRecursive(id, item.children);
                if (found) return found;
            }
        }
        return id;
    };

    const getOptionName = (id: string, list: FilterOption[]) => list.find(x => x.id === id)?.name || id;

    // --- Active Filters Chips Logic ---
    const activeFilters = [
        filters.year ? { label: `${t('filters.year')}: ${filters.year}`, onRemove: () => handleChange('year', '') } : null,
        (filters.months || []).length > 0 ? { label: `${t('filters.month')}: ${(filters.months || []).length}`, onRemove: () => handleChange('months', []) } : null,
        filters.area !== 'ALL' ? { label: `${t('filters.area')}: ${findAssetNameRecursive(filters.area, assets)}`, onRemove: () => handleChange('area', 'ALL') } : null,
        filters.equipment !== 'ALL' ? { label: `${t('filters.equipment')}: ${findAssetNameRecursive(filters.equipment, assets)}`, onRemove: () => handleChange('equipment', 'ALL') } : null,
        filters.subgroup !== 'ALL' ? { label: `${t('filters.subgroup')}: ${findAssetNameRecursive(filters.subgroup, assets)}`, onRemove: () => handleChange('subgroup', 'ALL') } : null,
        filters.status !== 'ALL' ? { label: `${t('filters.status')}: ${translateStatus(filters.status, getOptionName(filters.status, statuses), t)}`, onRemove: () => handleChange('status', 'ALL') } : null,
        filters.specialty !== 'ALL' ? { label: `${t('filters.specialty')}: ${getOptionName(filters.specialty, specialties)}`, onRemove: () => handleChange('specialty', 'ALL') } : null,
        filters.analysisType !== 'ALL' ? { label: `${t('filters.analysisType')}: ${getOptionName(filters.analysisType, analysisTypes)}`, onRemove: () => handleChange('analysisType', 'ALL') } : null,
        filters.searchTerm ? { label: `${t('common.search')}: "${filters.searchTerm}"`, onRemove: () => handleChange('searchTerm', '') } : null,

        // New Technical Filters Chips (Usually hidden in dropdown but shown as chips when clicked on charts)
        filters.componentType !== 'ALL' && filters.componentType ? { label: `${t('fields.componentType') || 'Comp'}: ${getOptionName(filters.componentType, componentTypes)}`, onRemove: () => handleChange('componentType', 'ALL') } : null,
        filters.failureMode !== 'ALL' && filters.failureMode ? { label: `${t('fields.failureMode') || 'Modo'}: ${getOptionName(filters.failureMode, failureModes)}`, onRemove: () => handleChange('failureMode', 'ALL') } : null,
        filters.failureCategory !== 'ALL' && filters.failureCategory ? { label: `${t('fields.failureCategory') || 'Cat'}: ${getOptionName(filters.failureCategory, failureCategories)}`, onRemove: () => handleChange('failureCategory', 'ALL') } : null,
        filters.rootCause6M !== 'ALL' && filters.rootCause6M ? { label: `6M: ${translate6M(filters.rootCause6M, getOptionName(filters.rootCause6M, rootCause6Ms), t)}`, onRemove: () => handleChange('rootCause6M', 'ALL') } : null,

    ].filter(Boolean);

    return (
        <div className="mb-8 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Header / Active Chips Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">

                <div className="flex-1 flex flex-wrap gap-2 items-center px-2 py-1">
                    <button
                        onClick={onToggle}
                        className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${isOpen ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700'}`}
                    >
                        <Filter size={16} />
                        {t('dashboard.filters')}
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {/* Active Filter Chips */}
                    {!isOpen && activeFilters.map((chip, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-100 animate-in zoom-in-95">
                            {chip?.label}
                            <button onClick={chip?.onRemove} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><X size={12} /></button>
                        </div>
                    ))}

                    {!isOpen && activeFilters.length === 0 && (
                        <span className="text-sm text-slate-400 italic ml-2">{t('filters.noFilters')}</span>
                    )}
                </div>

                <div className="flex items-center gap-4 px-4 border-l border-slate-100">
                    {/* Global Toggle */}
                    {onGlobalToggle && (
                        <div className="flex items-center gap-2 mr-2">
                            <button
                                onClick={onGlobalToggle}
                                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all border ${isGlobal
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-inner'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                    }`}
                                title={isGlobal ? t('filters.globalModeOnDesc') : t('filters.globalModeOffDesc')}
                            >
                                <Globe size={14} className={isGlobal ? "animate-pulse" : ""} />
                                {isGlobal ? t('filters.globalModeOn') : t('filters.globalModeOff')}
                            </button>
                        </div>
                    )}

                    {totalResults !== undefined && (
                        <div className="text-right">
                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('filters.totalRecords')}</div>
                            <div className="text-lg font-bold text-slate-800 leading-none">{totalResults}</div>
                        </div>
                    )}
                    {(activeFilters.length > 0 || isOpen) && (
                        <button onClick={onReset} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={t('filters.clear')}>
                            <RefreshCw size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Filter Panel */}
            {isOpen && (
                <div className="mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-6 animate-in slide-in-from-top-4 fade-in duration-200 z-10 relative">

                    {/* Section 1: Time & Search */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6 pb-6 border-b border-slate-100">
                        {showSearch && (
                            <div className="md:col-span-4">
                                <label htmlFor="filter_search" className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                                    <Search size={14} /> {t('filters.searchLabel')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="filter_search"
                                        name="filter_search"
                                        placeholder={t('filters.searchPlaceholder')}
                                        className="w-full pl-3 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={localSearch}
                                        onChange={e => setLocalSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        {showDate && (
                            <div className="md:col-span-8 flex flex-col md:flex-row gap-4">
                                <div className="w-full md:w-40">
                                    <label htmlFor="filter_year" className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                                        <Calendar size={14} /> {t('filters.year')}
                                    </label>
                                    <select
                                        id="filter_year"
                                        name="filter_year"
                                        value={filters.year}
                                        onChange={e => handleChange('year', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">{t('filters.options.all')}</option>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <span id="filter_month_label" className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('filters.month')}</span>
                                    <div className="flex flex-wrap gap-1" role="group" aria-labelledby="filter_month_label">
                                        {monthsList.map(m => {
                                            const isActive = (filters.months || []).includes(m.id);
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => toggleMonth(m.id)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${isActive
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                                        }`}
                                                >
                                                    {m.label}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => handleChange('months', [])}
                                            className="px-2 text-xs text-slate-400 hover:text-blue-500 underline ml-auto"
                                        >
                                            {t('filters.clear')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Section 2: Asset Hierarchy */}
                        {showAssetHierarchy && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-400" /> {t('filters.sections.location')}
                                </h4>
                                <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                                    <div>
                                        <label htmlFor="filter_area" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('filters.area')}</label>
                                        <select
                                            id="filter_area"
                                            name="filter_area"
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white hover:border-blue-300 transition-colors"
                                            value={filters.area}
                                            onChange={e => handleChange('area', e.target.value)}
                                        >
                                            <option value="ALL">{t('filters.options.allAreas')}</option>
                                            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="filter_equipment" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('filters.equipment')}</label>
                                        <select
                                            id="filter_equipment"
                                            name="filter_equipment"
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white disabled:opacity-50 hover:border-blue-300 transition-colors"
                                            value={filters.equipment}
                                            onChange={e => handleChange('equipment', e.target.value)}
                                            disabled={filters.area === 'ALL'}
                                        >
                                            <option value="ALL">{t('filters.options.allEquipments')}</option>
                                            {equipments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="filter_subgroup" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('filters.subgroup')}</label>
                                        <select
                                            id="filter_subgroup"
                                            name="filter_subgroup"
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white disabled:opacity-50 hover:border-blue-300 transition-colors"
                                            value={filters.subgroup}
                                            onChange={e => handleChange('subgroup', e.target.value)}
                                            disabled={filters.equipment === 'ALL'}
                                        >
                                            <option value="ALL">{t('filters.options.allSubgroups')}</option>
                                            {subgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Section 3: Classification */}
                        {(showAnalysisType || showSpecialty || showStatus) && (
                            <div className="space-y-4 lg:col-span-2">
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Tag size={16} className="text-slate-400" /> {t('filters.sections.classification')}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {showAnalysisType && (
                                        <div>
                                            <label htmlFor="filter_analysis_type" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('filters.analysisType')}</label>
                                            <select
                                                id="filter_analysis_type"
                                                name="filter_analysis_type"
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                                                value={filters.analysisType}
                                                onChange={e => handleChange('analysisType', e.target.value)}
                                            >
                                                <option value="ALL">{t('filters.options.allTypes')}</option>
                                                {analysisTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {showSpecialty && (
                                        <div>
                                            <label htmlFor="filter_specialty" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('filters.specialty')}</label>
                                            <select
                                                id="filter_specialty"
                                                name="filter_specialty"
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                                                value={filters.specialty}
                                                onChange={e => handleChange('specialty', e.target.value)}
                                            >
                                                <option value="ALL">{t('filters.options.allSpecialties')}</option>
                                                {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {showStatus && (
                                        <div>
                                            <label htmlFor="filter_status" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('filters.status')}</label>
                                            <select
                                                id="filter_status"
                                                name="filter_status"
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white font-medium text-slate-700"
                                                value={filters.status}
                                                onChange={e => handleChange('status', e.target.value)}
                                            >
                                                <option value="ALL">{t('filters.options.allStatus')}</option>
                                                {statuses.map(s => <option key={s.id} value={s.id}>{translateStatus(s.id, s.name, t)}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {showComponentType && (
                                        <div>
                                            <label htmlFor="filter_component_type" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('filters.componentType') || t('fields.componentType')}</label>
                                            <select
                                                id="filter_component_type"
                                                name="filter_component_type"
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white font-medium text-slate-700"
                                                value={filters.componentType || 'ALL'}
                                                onChange={e => handleChange('componentType', e.target.value)}
                                            >
                                                <option value="ALL">{t('filters.options.all')}</option>
                                                {componentTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    {t('filters.additionalFiltersHint')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
