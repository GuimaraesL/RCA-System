
import React, { useMemo } from 'react';
import { Search, Filter, RefreshCw, ChevronUp, ChevronDown, Calendar, X, MapPin, Tag, Layers } from 'lucide-react';
import { AssetNode } from '../types';

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
    };
    options?: {
        statuses?: FilterOption[];
        specialties?: FilterOption[];
        analysisTypes?: FilterOption[];
        assets?: AssetNode[];
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
    const {
        showSearch = true,
        showAssetHierarchy = true,
        showDate = true,
        showStatus = true,
        showSpecialty = true,
        showAnalysisType = true,
    } = config || {};

    const {
        statuses = [],
        specialties = [],
        analysisTypes = [],
        assets = []
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
        { id: '01', label: 'Jan' }, { id: '02', label: 'Fev' }, { id: '03', label: 'Mar' },
        { id: '04', label: 'Abr' }, { id: '05', label: 'Mai' }, { id: '06', label: 'Jun' },
        { id: '07', label: 'Jul' }, { id: '08', label: 'Ago' }, { id: '09', label: 'Set' },
        { id: '10', label: 'Out' }, { id: '11', label: 'Nov' }, { id: '12', label: 'Dez' },
    ];

    // Helper to resolve names for chips
    const getAssetName = (id: string, list: AssetNode[]) => list.find(x => x.id === id)?.name || id;
    const getOptionName = (id: string, list: FilterOption[]) => list.find(x => x.id === id)?.name || id;

    // --- Active Filters Chips Logic ---
    const activeFilters = [
        filters.year ? { label: `Ano: ${filters.year}`, onRemove: () => handleChange('year', '') } : null,
        filters.months.length > 0 ? { label: `Meses: ${filters.months.length}`, onRemove: () => handleChange('months', []) } : null,
        filters.area !== 'ALL' ? { label: `Área: ${getAssetName(filters.area, areas)}`, onRemove: () => handleChange('area', 'ALL') } : null,
        filters.equipment !== 'ALL' ? { label: `Eq: ${getAssetName(filters.equipment, equipments)}`, onRemove: () => handleChange('equipment', 'ALL') } : null,
        filters.status !== 'ALL' ? { label: `Status: ${getOptionName(filters.status, statuses)}`, onRemove: () => handleChange('status', 'ALL') } : null,
        filters.specialty !== 'ALL' ? { label: `Esp: ${getOptionName(filters.specialty, specialties)}`, onRemove: () => handleChange('specialty', 'ALL') } : null,
        filters.analysisType !== 'ALL' ? { label: `Tipo: ${getOptionName(filters.analysisType, analysisTypes)}`, onRemove: () => handleChange('analysisType', 'ALL') } : null,
        filters.searchTerm ? { label: `Busca: "${filters.searchTerm}"`, onRemove: () => handleChange('searchTerm', '') } : null,
    ].filter(Boolean);

    return (
        <div className="mb-8 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Header / Active Chips Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                
                <div className="flex-1 flex flex-wrap gap-2 items-center px-2 py-1">
                    <button 
                        onClick={onToggle} 
                        className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isOpen ? 'bg-slate-100 text-slate-800' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}
                    >
                        <Filter size={16} />
                        Filtros
                        {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>

                    {/* Active Filter Chips */}
                    {!isOpen && activeFilters.map((chip, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-100 animate-in zoom-in-95">
                            {chip?.label}
                            <button onClick={chip?.onRemove} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><X size={12}/></button>
                        </div>
                    ))}
                    
                    {!isOpen && activeFilters.length === 0 && (
                        <span className="text-sm text-slate-400 italic ml-2">Nenhum filtro aplicado.</span>
                    )}
                </div>

                <div className="flex items-center gap-4 px-4 border-l border-slate-100">
                     {totalResults !== undefined && (
                        <div className="text-right">
                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Registros</div>
                            <div className="text-lg font-bold text-slate-800 leading-none">{totalResults}</div>
                        </div>
                    )}
                    {(activeFilters.length > 0 || isOpen) && (
                        <button onClick={onReset} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Limpar Filtros">
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
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                                    <Search size={14}/> Busca Textual
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Título, ID, Problema..." 
                                        className="w-full pl-3 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={filters.searchTerm}
                                        onChange={e => handleChange('searchTerm', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        {showDate && (
                            <div className="md:col-span-8 flex flex-col md:flex-row gap-4">
                                <div className="w-full md:w-40">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                                        <Calendar size={14}/> Ano Fiscal
                                    </label>
                                    <select 
                                        value={filters.year} 
                                        onChange={e => handleChange('year', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Todos</option>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mês de Ocorrência</label>
                                    <div className="flex flex-wrap gap-1">
                                        {monthsList.map(m => {
                                            const isActive = filters.months.includes(m.id);
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => toggleMonth(m.id)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
                                                        isActive 
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
                                            Limpar
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
                                    <MapPin size={16} className="text-slate-400"/> Localização Técnica
                                </h4>
                                <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Área</label>
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white hover:border-blue-300 transition-colors"
                                            value={filters.area}
                                            onChange={e => handleChange('area', e.target.value)}
                                        >
                                            <option value="ALL">Todas as Áreas</option>
                                            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Equipamento</label>
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white disabled:opacity-50 hover:border-blue-300 transition-colors"
                                            value={filters.equipment}
                                            onChange={e => handleChange('equipment', e.target.value)}
                                            disabled={filters.area === 'ALL'}
                                        >
                                            <option value="ALL">Todos os Equipamentos</option>
                                            {equipments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subgrupo</label>
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white disabled:opacity-50 hover:border-blue-300 transition-colors"
                                            value={filters.subgroup}
                                            onChange={e => handleChange('subgroup', e.target.value)}
                                            disabled={filters.equipment === 'ALL'}
                                        >
                                            <option value="ALL">Todos os Subgrupos</option>
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
                                    <Tag size={16} className="text-slate-400"/> Classificação e Status
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {showAnalysisType && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Análise</label>
                                            <select 
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                                                value={filters.analysisType}
                                                onChange={e => handleChange('analysisType', e.target.value)}
                                            >
                                                <option value="ALL">Todos</option>
                                                {analysisTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {showSpecialty && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Especialidade</label>
                                            <select 
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                                                value={filters.specialty}
                                                onChange={e => handleChange('specialty', e.target.value)}
                                            >
                                                <option value="ALL">Todas</option>
                                                {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {showStatus && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Atual</label>
                                            <select 
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white font-medium text-slate-700"
                                                value={filters.status}
                                                onChange={e => handleChange('status', e.target.value)}
                                            >
                                                <option value="ALL">Todos</option>
                                                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
