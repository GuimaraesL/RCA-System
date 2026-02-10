
import React, { useState, useMemo } from 'react';
import { Search, FileText, CheckCircle, Clock, AlertCircle, Calendar, Filter } from 'lucide-react';
import { RcaRecord, AssetNode } from '../types';
import { useLanguage } from '../context/LanguageDefinition';
import { translateStatus } from '../utils/statusUtils';

interface RcaSelectorProps {
    records: RcaRecord[];
    assets: AssetNode[];
    onSelect: (rcaId: string) => void;
    onCancel: () => void;
}

export const RcaSelector: React.FC<RcaSelectorProps> = ({ records, assets, onSelect, onCancel }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');

    // Filters State
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedEquip, setSelectedEquip] = useState('');
    const [selectedSub, setSelectedSub] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');

    // Derived Options for Filters
    const areas = useMemo(() => assets.filter(a => a.type === 'AREA'), [assets]);
    const equipments = useMemo(() => {
        if (!selectedArea) return [];
        const areaNode = areas.find(a => a.id === selectedArea);
        return areaNode?.children || [];
    }, [selectedArea, areas]);

    const subgroups = useMemo(() => {
        if (!selectedEquip) return [];
        for (const area of areas) {
            const areaWithEquip = areas.find(a => a.children?.some(e => e.id === selectedEquip));
            const eq = areaWithEquip?.children?.find(e => e.id === selectedEquip);
            if (eq) return eq.children || [];
        }
        return [];
    }, [selectedEquip, areas]);

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

    const months = [
        { value: '0', label: t('filters.monthsList.jan') || 'Janeiro' },
        { value: '1', label: t('filters.monthsList.feb') || 'Fevereiro' },
        { value: '2', label: t('filters.monthsList.mar') || 'Março' },
        { value: '3', label: t('filters.monthsList.apr') || 'Abril' },
        { value: '4', label: t('filters.monthsList.may') || 'Maio' },
        { value: '5', label: t('filters.monthsList.jun') || 'Junho' },
        { value: '6', label: t('filters.monthsList.jul') || 'Julho' },
        { value: '7', label: t('filters.monthsList.aug') || 'Agosto' },
        { value: '8', label: t('filters.monthsList.sep') || 'Setembro' },
        { value: '9', label: t('filters.monthsList.oct') || 'Outubro' },
        { value: '10', label: t('filters.monthsList.nov') || 'Novembro' },
        { value: '11', label: t('filters.monthsList.dec') || 'Dezembro' }
    ];

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            // Text Search
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch =
                (r.id || '').toLowerCase().includes(lowerSearch) ||
                (r.what || '').toLowerCase().includes(lowerSearch) ||
                (r.os_number || '').toLowerCase().includes(lowerSearch);

            if (!matchesSearch) return false;

            // Filters
            if (selectedArea && r.area_id !== selectedArea) return false;
            if (selectedEquip && r.equipment_id !== selectedEquip) return false;
            if (selectedSub && r.subgroup_id !== selectedSub) return false;

            if (selectedYear || selectedMonth) {
                const dateStr = r.failure_date || r.analysis_date;
                if (!dateStr) return false;
                const date = new Date(dateStr);
                if (selectedYear && date.getFullYear().toString() !== selectedYear) return false;
                if (selectedMonth && date.getMonth().toString() !== selectedMonth) return false;
            }

            return true;
        });
    }, [records, searchTerm, selectedArea, selectedEquip, selectedSub, selectedYear, selectedMonth]);

    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s.includes('conclu') || s.includes('done') || s.includes('fech')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('anda') || s.includes('progress')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s.includes('cancel') || s.includes('remov')) return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR');
        } catch { return dateStr; }
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-4xl bg-white rounded-lg overflow-hidden shadow-2xl">

            {/* Header & Filters */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={t('rcaSelector.searchPlaceholder')}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-2">
                    <select
                        className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none max-w-[150px]"
                        value={selectedArea}
                        onChange={(e) => { setSelectedArea(e.target.value); setSelectedEquip(''); setSelectedSub(''); }}
                    >
                        <option value="">{t('rcaSelector.filters.areas')}</option>
                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <select
                        className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none max-w-[150px]"
                        value={selectedEquip}
                        onChange={(e) => { setSelectedEquip(e.target.value); setSelectedSub(''); }}
                        disabled={!selectedArea}
                    >
                        <option value="">{t('rcaSelector.filters.equipments')}</option>
                        {equipments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>

                    <select
                        className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none max-w-[150px]"
                        value={selectedSub}
                        onChange={(e) => setSelectedSub(e.target.value)}
                        disabled={!selectedEquip}
                    >
                        <option value="">{t('rcaSelector.filters.subgroups')}</option>
                        {subgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>

                    <select
                        className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none w-24"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="">{t('rcaSelector.filters.year')}</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select
                        className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none w-28"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="">{t('rcaSelector.filters.month')}</option>
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>

                    {(selectedArea || selectedYear || selectedMonth) && (
                        <button
                            onClick={() => { setSelectedArea(''); setSelectedEquip(''); setSelectedSub(''); setSelectedYear(''); setSelectedMonth(''); }}
                            className="text-xs text-red-500 hover:text-red-700 ml-auto font-medium"
                        >
                            {t('rcaSelector.filters.clear')}
                        </button>
                    )}
                </div>

                <div className="text-xs text-slate-500 flex justify-between items-center pt-1">
                    <span>
                        <strong className="text-slate-700">{filteredRecords.length}</strong> {t('rcaSelector.resultsFound').replace('{0}', '')}
                    </span>
                    {records.length > 500 && filteredRecords.length > 50 && <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{t('rcaSelector.manyResults')}</span>}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
                {filteredRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                        <Filter size={48} className="mb-2" />
                        <p>{t('rcaSelector.noResults')}</p>
                    </div>
                ) : (
                    filteredRecords.slice(0, 100).map(rca => (
                        <div
                            key={rca.id}
                            onClick={() => onSelect(rca.id)}
                            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(rca.status)} uppercase`}>
                                        {translateStatus(rca.status, rca.status, t)}
                                    </span>
                                    <span className="font-mono text-xs font-medium text-slate-500">{rca.id}</span>
                                    {rca.os_number && <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1 rounded">OS: {rca.os_number}</span>}
                                </div>
                                <div className="flex items-center text-xs text-slate-400 gap-1">
                                    <Calendar size={12} />
                                    {formatDate(rca.failure_date || rca.analysis_date)}
                                </div>
                            </div>

                            <div className="text-sm font-medium text-slate-800 line-clamp-2 group-hover:text-blue-700">
                                {rca.what || <span className="italic text-slate-400">{t('common.noDescription')}</span>}
                            </div>

                            {rca.file_path && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-full">
                                    <FileText size={10} />
                                    <span className="truncate" title={rca.file_path}>{rca.file_path}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
                {filteredRecords.length > 100 && (
                    <div className="p-2 text-center text-xs text-slate-400 italic">
                        {t('rcaSelector.showingFirst').replace('{0}', '100').replace('{1}', filteredRecords.length.toString())}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                    {t('rcaSelector.cancel')}
                </button>
            </div>
        </div>
    );
};
