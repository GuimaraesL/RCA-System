import React, { useState, useMemo } from 'react';
import { Search, FileText, Calendar, Filter, ChevronRight, X, Database } from 'lucide-react';
import { RcaRecord, AssetNode } from '../types';
import { useLanguage } from '../context/LanguageDefinition';
import { translateStatus } from '../utils/statusUtils';
import { AssetSelector } from './AssetSelector';

interface RcaSelectorProps {
    records: RcaRecord[];
    assets: AssetNode[];
    onSelect: (rcaId: string) => void;
    onCancel: () => void;
}

export const RcaSelector: React.FC<RcaSelectorProps> = ({ records, assets, onSelect, onCancel }) => {
    const { t } = useLanguage();
    const idPrefix = React.useId();
    const [searchTerm, setSearchTerm] = useState('');

    // Filters State
    const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');

    const years = useMemo(() => {
        const uniqueYears = new Set<string>();
        records.forEach(r => {
            const d = r.failure_date || r.analysis_date;
            if (d) {
                try { uniqueYears.add(new Date(d).getFullYear().toString()); } catch { }
            }
        });
        return Array.from(uniqueYears).sort().reverse();
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            // Text Search
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch =
                (r.id || '').toLowerCase().includes(lowerSearch) ||
                (r.what || '').toLowerCase().includes(lowerSearch) ||
                (r.os_number || '').toLowerCase().includes(lowerSearch);

            if (!matchesSearch) return false;

            // Asset Hierarchy Filter
            if (selectedAsset) {
                if (selectedAsset.type === 'AREA' && r.area_id !== selectedAsset.id) return false;
                if (selectedAsset.type === 'EQUIPMENT' && r.equipment_id !== selectedAsset.id) return false;
                if (selectedAsset.type === 'SUBGROUP' && r.subgroup_id !== selectedAsset.id) return false;
            }

            if (selectedYear || selectedMonth) {
                const dateStr = r.failure_date || r.analysis_date;
                if (!dateStr) return false;
                const date = new Date(dateStr);
                if (selectedYear && date.getFullYear().toString() !== selectedYear) return false;
                if (selectedMonth && date.getMonth().toString() !== selectedMonth) return false;
            }

            return true;
        });
    }, [records, searchTerm, selectedAsset, selectedYear, selectedMonth]);

    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s.includes('conclu') || s.includes('done') || s.includes('fech')) return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm';
        if (s.includes('anda') || s.includes('progress')) return 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm';
        if (s.includes('cancel') || s.includes('remov')) return 'bg-rose-50 text-rose-700 border-rose-100 line-through opacity-60';
        return 'bg-slate-50 text-slate-600 border-slate-200';
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR');
        } catch { return dateStr; }
    };

    return (
        <div className="flex flex-col md:flex-row h-[800px] w-full max-w-6xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">

            {/* Sidebar de Filtros (Asset Tree) */}
            <div className="w-full md:w-80 border-r border-slate-100 bg-slate-50/50 flex flex-col p-8 gap-6">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{t('assets.hierarchy')}</h3>
                    <AssetSelector
                        assets={assets}
                        onSelect={setSelectedAsset}
                        selectedAssetId={selectedAsset?.id}
                    />
                    {selectedAsset && (
                        <div className="mt-4 p-3 bg-white rounded-xl border border-blue-100 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                <span className="text-xs font-bold text-blue-700 truncate max-w-[180px]">{selectedAsset.name}</span>
                            </div>
                            <button onClick={() => setSelectedAsset(null)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                <X size={14} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('rcaSelector.filters.year')}</h3>
                    <select
                        id={`${idPrefix}-year`}
                        className="w-full text-xs font-black border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-blue-500/10 outline-none cursor-pointer transition-all"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="">TODOS OS ANOS</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                {(selectedAsset || selectedYear) && (
                    <button
                        onClick={() => { setSelectedAsset(null); setSelectedYear(''); setSearchTerm(''); }}
                        className="mt-auto w-full flex items-center justify-center gap-2 py-3 bg-white border border-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95"
                    >
                        <Filter size={14} strokeWidth={3} />
                        Limpar Filtros
                    </button>
                )}
            </div>

            {/* Conteúdo Principal (Busca e Lista) */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="p-8 border-b border-slate-100 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText size={22} /></div>
                            <h3 className="text-xl font-black text-slate-900 font-display tracking-tight uppercase italic">{t('rcaSelector.title') || 'Vincular Análise'}</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Encontradas</span>
                            <strong className="text-2xl font-black text-blue-600 leading-none">{filteredRecords.length}</strong>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            id={`${idPrefix}-search`}
                            type="text"
                            placeholder={t('rcaSelector.searchPlaceholder')}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none text-sm font-bold shadow-inner transition-all placeholder-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/30 custom-scrollbar">
                    {filteredRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                                <Database size={40} className="opacity-20" />
                            </div>
                            <p className="font-black text-xs uppercase tracking-widest">{t('rcaSelector.noResults')}</p>
                        </div>
                    ) : (
                        filteredRecords.slice(0, 100).map(rca => (
                            <div
                                key={rca.id}
                                onClick={() => onSelect(rca.id)}
                                className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer transition-all group animate-in fade-in duration-300"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${getStatusColor(rca.status)}`}>
                                            {translateStatus(rca.status, rca.status, t)}
                                        </span>
                                        <span className="font-mono text-xs font-black text-slate-400 group-hover:text-blue-500 transition-colors">#{rca.id.substring(0, 8)}</span>
                                    </div>
                                    <div className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                        <Calendar size={12} strokeWidth={3} />
                                        {formatDate(rca.failure_date || rca.analysis_date)}
                                    </div>
                                </div>

                                <div className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors mt-2">
                                    {rca.what || <span className="italic text-slate-300 font-medium">{t('common.noDescription')}</span>}
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-4">
                                        {rca.os_number && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest">
                                                OS: {rca.os_number}
                                            </div>
                                        )}
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[250px]">
                                            {rca.asset_name_display || '-'}
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                                        Vincular <ChevronRight size={14} strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end">
                    <button
                        onClick={onCancel}
                        className="px-8 py-3 text-slate-500 font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-200"
                    >
                        {t('rcaSelector.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};