import React, { useState, useMemo, useEffect } from 'react';
import { Search, FileText, Calendar, Filter, ChevronRight, X, Database, Layers, Activity } from 'lucide-react';
import { RcaRecord, AssetNode, TaxonomyConfig } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';
import { translateStatus } from '../../utils/statusUtils';
import { AssetSelector } from './AssetSelector';
import { StatusBadge } from '../ui/StatusBadge';
import { filterAssetsByUsage } from '../../services/utils';
import { useFilteredData } from '../../hooks/useFilteredData';

interface RcaSelectorProps {
    records: RcaRecord[];
    assets: AssetNode[];
    taxonomy: TaxonomyConfig;
    onSelect: (rcaId: string) => void;
    onCancel: () => void;
}

export const RcaSelector: React.FC<RcaSelectorProps> = ({ records, assets, taxonomy, onSelect, onCancel }) => {
    const { t, language } = useLanguage();
    const idPrefix = React.useId();

    // Proteção contra taxonomia indefinida (Issue #83 Fix)
    if (!taxonomy) return null;

    // --- Local Selection State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedType, setSelectedType] = useState('ALL');

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Debouncing implementation
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    /**
     * Mapeamento do estado local para o FilterState padrão do sistema.
     * Isso permite a reutilização total do hook useFilteredData.
     */
    const activeFilters = useMemo(() => ({
        searchTerm: debouncedSearch,
        year: selectedYear,
        months: selectedMonth ? [selectedMonth] : [],
        status: selectedStatus,
        area: selectedAsset?.type === 'AREA' ? selectedAsset.id : 'ALL',
        equipment: selectedAsset?.type === 'EQUIPMENT' ? selectedAsset.id : 'ALL',
        subgroup: selectedAsset?.type === 'SUBGROUP' ? selectedAsset.id : 'ALL',
        specialty: 'ALL',
        analysisType: selectedType,
        failureMode: 'ALL',
        failureCategory: 'ALL',
        componentType: 'ALL',
        rootCause6M: 'ALL'
    }), [debouncedSearch, selectedYear, selectedMonth, selectedStatus, selectedAsset, selectedType]);

    // Hook de filtragem centralizado (O(N) e lógica de cascata nativa)
    const { filteredRCAs: filteredRecords, availableOptions } = useFilteredData(activeFilters, records, assets);

    // Reseta paginação quando os filtros mudam
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilters]);

    /**
     * Complete years list from all records (not just filtered) to populate the dropdown.
     */
    const yearsList = useMemo(() => {
        const uniqueYears = new Set<string>();
        records.forEach(r => {
            const d = r.failure_date || r.analysis_date;
            if (d) {
                const y = d.replace(/\//g, '-').split('-')[0];
                if (y && y.length === 4) uniqueYears.add(y);
            }
        });
        return Array.from(uniqueYears).sort().reverse();
    }, [records]);

    const monthsList = [
        { id: '01', label: t('filters.monthsList.jan') }, { id: '02', label: t('filters.monthsList.feb') }, { id: '03', label: t('filters.monthsList.mar') },
        { id: '04', label: t('filters.monthsList.apr') }, { id: '05', label: t('filters.monthsList.may') }, { id: '06', label: t('filters.monthsList.jun') },
        { id: '07', label: t('filters.monthsList.jul') }, { id: '08', label: t('filters.monthsList.aug') }, { id: '09', label: t('filters.monthsList.sep') },
        { id: '10', label: t('filters.monthsList.oct') }, { id: '11', label: t('filters.monthsList.nov') }, { id: '12', label: t('filters.monthsList.dec') },
    ];

    const paginatedRecords = useMemo(() => {
        return filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredRecords, currentPage]);


    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const normalized = dateStr.replace(/\//g, '-');
            return new Date(normalized).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US');
        } catch { return dateStr; }
    };

    const clearFilters = () => {
        setSelectedAsset(null);
        setSelectedYear('');
        setSelectedMonth('');
        setSelectedStatus('ALL');
        setSelectedType('ALL');
        setSearchTerm('');
    };

    // --- Asset Tree Pruning (Issue #36 methodology) ---
    const usedAssetIds = useMemo(() => {
        const ids = new Set<string>();
        filteredRecords.forEach(r => {
            if (r.area_id) ids.add(r.area_id);
            if (r.equipment_id) ids.add(r.equipment_id);
            if (r.subgroup_id) ids.add(r.subgroup_id);
        });
        return ids;
    }, [filteredRecords]);

    const filteredAssets = useMemo(() => {
        // Se houver filtros ativos (exceto assets), removemos ativos sem registros
        if (selectedYear || selectedMonth || selectedStatus !== 'ALL' || selectedType !== 'ALL' || debouncedSearch) {
            return filterAssetsByUsage(assets, usedAssetIds);
        }
        return assets;
    }, [assets, usedAssetIds, selectedYear, selectedMonth, selectedStatus, selectedType, debouncedSearch]);

    const hasActiveFilters = selectedAsset || selectedYear || selectedMonth || selectedStatus !== 'ALL' || selectedType !== 'ALL' || searchTerm !== '';

    return (
        <div className="flex flex-col md:flex-row h-[850px] w-full max-w-7xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200/60 animate-in zoom-in-95 duration-500">

            {/* Sidebar de Filtros Lateral (Estilo AnalysesView) */}
            <div className="w-full md:w-80 border-r border-slate-100 bg-slate-50/50 flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-600/20"><Filter size={18} strokeWidth={3} /></div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('filters.title') || 'Filtros'}</h3>
                </div>

                {/* Localização Técnica */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('filters.sections.location')}</h4>
                    <AssetSelector
                        assets={filteredAssets}
                        onSelect={setSelectedAsset}
                        selectedAssetId={selectedAsset?.id}
                        selectableTypes={['SUBGROUP']}
                    />
                    {selectedAsset && (
                        <div className="p-3 bg-white rounded-2xl border border-primary-100 shadow-sm flex items-center justify-between animate-in slide-in-from-left-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary-600 shadow-sm shadow-primary-600/40"></div>
                                <span
                                    className="text-[11px] font-black text-primary-700 truncate max-w-[180px] uppercase tracking-tight"
                                    title={selectedAsset.name}
                                >
                                    {selectedAsset.name}
                                </span>
                            </div>
                            <button onClick={() => setSelectedAsset(null)} className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all">
                                <X size={14} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Classificação */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('filters.sections.classification')}</h4>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t('filters.status')}</label>
                        <select
                            className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all cursor-pointer"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="ALL">{t('filters.options.allStatus')}</option>
                            {taxonomy.analysisStatuses.map(s => {
                                const isAvailable = availableOptions.status.has(s.id);
                                if (!isAvailable && selectedStatus !== s.id) return null; // #36: Hide zero-result options
                                return <option key={s.id} value={s.id}>{translateStatus(s.id, s.name, t)}</option>;
                            })}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t('filters.analysisType')}</label>
                        <select
                            className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all cursor-pointer"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="ALL">{t('filters.options.allTypes')}</option>
                            {taxonomy.analysisTypes.map(type => {
                                const isAvailable = availableOptions.analysisType.has(type.id);
                                if (!isAvailable && selectedType !== type.id) return null; // #36: Hide zero-result options
                                return <option key={type.id} value={type.id}>{type.name}</option>;
                            })}
                        </select>
                    </div>
                </div>

                {/* Filtros Temporais */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('filters.year')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <select
                            className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all cursor-pointer"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="">{t('filters.options.all')}</option>
                            {yearsList.map(y => {
                                const isAvailable = availableOptions.year.has(y);
                                if (!isAvailable && selectedYear !== y) return null; // #36: Hide zero-result options
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                        <select
                            className="w-full text-xs font-bold border border-slate-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all cursor-pointer"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            <option value="">{t('filters.options.all')}</option>
                            {monthsList.map(m => {
                                const isAvailable = availableOptions.months.has(m.id);
                                if (!isAvailable && selectedMonth !== m.id) return null; // #36: Hide zero-result options
                                return <option key={m.id} value={m.id}>{m.label}</option>;
                            })}
                        </select>
                    </div>
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-100 transition-all active:scale-95 border border-rose-100 shadow-sm"
                    >
                        <X size={14} strokeWidth={3} />
                        {t('filters.clear')}
                    </button>
                )}
            </div>

            {/* Conteúdo Principal (Busca e Lista de Cards) */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* Header de Busca */}
                <div className="p-10 border-b border-slate-100 space-y-8 bg-white sticky top-0 z-10 shadow-sm shadow-slate-100/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-primary-50 text-primary-600 rounded-[1.25rem] shadow-inner border border-primary-100/50"><FileText size={28} /></div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 font-display tracking-tight uppercase italic leading-none">{t('rcaSelector.title') || 'Vincular Análise'}</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">{t('rcaSelector.description') || 'Selecione uma análise para vincular a este evento'}</p>
                            </div>
                        </div>
                        <div className="text-right bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('pagination.results') || 'Encontradas'}</span>
                            <strong className="text-3xl font-black text-primary-600 tracking-tighter tabular-nums leading-none">{filteredRecords.length}</strong>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={22} />
                        <input
                            id={`${idPrefix}-search`}
                            type="text"
                            placeholder={t('rcaSelector.searchPlaceholder')}
                            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:ring-8 focus:ring-primary-500/5 focus:border-primary-500 focus:bg-white outline-none text-base font-bold shadow-inner transition-all placeholder-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 text-slate-500 rounded-full hover:bg-slate-300 transition-colors"
                            >
                                <X size={14} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Lista de Cards com Scroll */}
                <div className="flex-1 overflow-y-auto p-10 space-y-5 bg-slate-50/30 custom-scrollbar">
                    {paginatedRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-8 shadow-sm border border-slate-100">
                                <Database size={48} className="opacity-10" />
                            </div>
                            <p className="font-black text-[11px] uppercase tracking-[0.3em]">{t('rcaSelector.noResults')}</p>
                        </div>
                    ) : (
                        paginatedRecords.map(rca => {
                            const statusObj = taxonomy.analysisStatuses.find(s => s.id === rca.status);
                            const statusName = statusObj ? statusObj.name : rca.status;

                            return (
                                <div
                                    key={rca.id}
                                    onClick={() => onSelect(rca.id)}
                                    className="bg-white p-8 rounded-[2.25rem] border border-slate-200/60 shadow-sm hover:border-primary-400 hover:shadow-2xl hover:shadow-primary-500/10 cursor-pointer transition-all group animate-in fade-in slide-in-from-bottom-2 duration-500"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <StatusBadge statusId={rca.status} label={translateStatus(rca.status, statusName, t)} size="sm" />
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                                <span className="font-mono text-[11px] font-black text-slate-400 group-hover:text-primary-500 transition-colors uppercase tracking-widest">#RCA-{rca.id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest gap-2.5 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-inner">
                                            <Calendar size={14} className="text-slate-300" strokeWidth={3} />
                                            {formatDate(rca.failure_date || rca.analysis_date)}
                                        </div>
                                    </div>

                                    <div className="text-lg font-black text-slate-800 line-clamp-2 group-hover:text-primary-700 transition-colors tracking-tight leading-tight">
                                        {rca.what || <span className="italic text-slate-300 font-bold opacity-50">{t('common.noDescription')}</span>}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between mt-6 pt-6 border-t border-slate-50 gap-4">
                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors"><Database size={14} /></div>
                                                <div
                                                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[200px]"
                                                    title={rca.asset_name_display || ''}
                                                >
                                                    {rca.asset_name_display || '-'}
                                                </div>
                                            </div>
                                            {rca.os_number && (
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors"><Layers size={14} /></div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        OS: <span className="text-slate-600">{rca.os_number}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><Activity size={14} /></div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {rca.analysis_type ? (taxonomy.analysisTypes.find(at => at.id === rca.analysis_type)?.name || rca.analysis_type) : '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-primary-600 font-black text-[10px] uppercase tracking-[0.2em] bg-primary-50/50 px-4 py-2 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-primary-600/20 group-hover:scale-105 active:scale-95">
                                            {t('rcaSelector.vincular')} <ChevronRight size={14} strokeWidth={4} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Rodapé de Paginação e Cancelamento */}
                <div className="px-10 py-8 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onCancel}
                            className="px-8 py-3.5 text-slate-400 font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 hover:text-slate-600 rounded-[1.25rem] transition-all border border-transparent hover:border-slate-200"
                        >
                            {t('rcaSelector.cancel')}
                        </button>
                    </div>

                    {filteredRecords.length > itemsPerPage && (
                        <div className="flex items-center gap-6">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest tabular-nums">
                                {t('pagination.showing')} <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> {t('pagination.of')} <span className="text-slate-900">{filteredRecords.length}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-3 bg-white border-2 border-slate-100 rounded-xl text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed hover:border-primary-400 hover:text-primary-600 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronRight size={18} strokeWidth={3} className="rotate-180" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => (filteredRecords.length > prev * itemsPerPage ? prev + 1 : prev))}
                                    disabled={currentPage * itemsPerPage >= filteredRecords.length}
                                    className="p-3 bg-white border-2 border-slate-100 rounded-xl text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed hover:border-primary-400 hover:text-primary-600 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronRight size={18} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
