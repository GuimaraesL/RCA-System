
import React, { useMemo } from 'react';
import { RcaRecord, ActionRecord } from '../types';
import { STATUS_IDS, ACTION_STATUS_IDS } from '../constants/SystemConstants';
import { ArrowUp, ArrowDown, Activity, AlertCircle, Calendar, CheckCircle2, Clock, ShieldCheck, Award } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useSorting } from '../hooks/useSorting';
import { SortHeader } from './ui/SortHeader';
import { useLanguage } from '../context/LanguageDefinition';
import { useFilteredData } from '../hooks/useFilteredData';

interface ReportsViewProps {
    records: RcaRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ records }) => {
    const { t } = useLanguage();

    const getStatusBadge = (status: string) => {
        switch (status) {
          case ACTION_STATUS_IDS.APPROVED: 
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100 shadow-sm">
                <CheckCircle2 size={12} strokeWidth={3} />
                {t('actionModal.statusOptions.approved')}
              </span>
            );
          case ACTION_STATUS_IDS.IN_PROGRESS: 
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-100 shadow-sm">
                <Clock size={12} strokeWidth={3} />
                {t('actionModal.statusOptions.inProgress')}
              </span>
            );
          case ACTION_STATUS_IDS.COMPLETED: 
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-100 shadow-sm">
                <ShieldCheck size={12} strokeWidth={3} />
                {t('actionModal.statusOptions.completed')}
              </span>
            );
          case ACTION_STATUS_IDS.VERIFIED: 
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-100 shadow-sm">
                <Award size={12} strokeWidth={3} />
                {t('actionModal.statusOptions.verified')}
              </span>
            );
          default: return <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs font-mono">{status || '-'}</span>;
        }
    };

    const defaultFilters: FilterState = {
        searchTerm: '',
        year: '',
        months: [],
        status: 'ALL',
        area: 'ALL',
        equipment: 'ALL',
        subgroup: 'ALL',
        specialty: 'ALL',
        analysisType: 'ALL',
        failureMode: 'ALL',
        failureCategory: 'ALL',
        componentType: 'ALL',
        rootCause6M: 'ALL'
    };

    const { filters, setFilters, showFilters, setShowFilters, handleReset } = useFilterPersistence(
        'rca_reports_view',
        defaultFilters,
        false
    );

    // Apply Filters to get Base Records via standard Hook
    const { filteredRCAs: filteredRecords, availableOptions } = useFilteredData(filters);

    // KPI Calculation
    const isClosed = (status: string) => status === STATUS_IDS.CONCLUDED || status === 'Ef. Comprovada';

    const totalOpen = filteredRecords.filter(r => !isClosed(r.status)).length;
    const totalClosed = filteredRecords.filter(r => isClosed(r.status)).length;
    const avgDuration = 15; // Placeholder

    // Extract ALL Actions from ALL Records (for comprehensive analysis, or filtered?)
    // Decision: Show actions linked to the FILTERED records.
    const allSystemActions = records.flatMap(r =>
        (r.root_causes || []).flatMap(rc =>
            (rc.actions || []).map(a => ({ ...a, rca_id: r.id, rca_title: r.what }))
        )
    );

    // Resolve Actions for Filtered Records Only
    const filteredRecordIds = new Set(filteredRecords.map(r => r.id));
    const relevantActions = allSystemActions.filter(a => filteredRecordIds.has(a.rca_id));

    // Open: Status not 3 (Concluída) and not 4 (Ef. Comprovada)
    const openActionsRaw = useMemo(() =>
        relevantActions.filter(a => a.status !== '3' && a.status !== '4'),
        [relevantActions]);

    // Sorting
    const { sortedItems: openActions, sortConfig, handleSort } = useSorting(openActionsRaw, { key: 'date', direction: 'asc' });

    const overdueActions = openActions.filter(a => new Date(a.date) < new Date());

        return (
            <div className="p-8 lg:p-12 max-w-[1600px] mx-auto space-y-10">
                <div className="flex justify-between items-end animate-in fade-in slide-in-from-top-4 duration-700">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 font-display tracking-tight">{t('reports.title')}</h1>
                        <p className="text-slate-500 mt-2 font-medium">{t('reports.subtitle')}</p>
                        <div className="flex items-center gap-2 mt-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded">{t('common.box')}</span>
                            <span className="text-xs text-slate-400 font-medium">{t('reports.lastUpdated')}: {new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
    
                <div className="animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
                    <FilterBar
                        isOpen={showFilters}
                        onToggle={() => setShowFilters(!showFilters)}
                        filters={filters}
                        onFilterChange={setFilters}
                        onReset={() => handleReset(defaultFilters)}
                        totalResults={filteredRecords.length}
                        config={{ showDate: true, showStatus: true, showSearch: true, showAnalysisType: true, showAssetHierarchy: true, showComponentType: true }}
                        availableOptions={availableOptions}    
                    />
                </div>
    
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 transition-all hover:shadow-xl hover:shadow-blue-500/5 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Activity size={24} /></div>
                            {overdueActions.length > 0 && <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 animate-pulse uppercase tracking-widest">{overdueActions.length} {t('reports.overdue')}</span>}
                        </div>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{filteredRecords.length}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">{t('reports.totalAnalyses')}</div>
                    </div>
    
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 transition-all hover:shadow-xl hover:shadow-blue-500/5 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><AlertCircle size={24} /></div>
                        </div>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{totalOpen}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">{t('reports.openAnalyses')}</div>
                    </div>
    
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 transition-all hover:shadow-xl hover:shadow-blue-500/5 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></div>
                        </div>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{totalClosed}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">{t('reports.concluded')}</div>
                    </div>
    
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 transition-all hover:shadow-xl hover:shadow-blue-500/5 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Calendar size={24} /></div>
                        </div>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{openActions.length}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">{t('reports.pendingActions')}</div>
                    </div>
                </div>
    
                {/* Actions Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden animate-in fade-in duration-1000 delay-300">
                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-black text-slate-700 text-xs uppercase tracking-[0.2em] flex items-center gap-3">
                            <AlertTriangle size={18} className="text-amber-500" /> {t('reports.filteredActionsTitle')}
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 border-separate border-spacing-0">
                            <thead className="bg-white text-slate-500 font-black border-b border-slate-100">
                                <tr>
                                    <SortHeader label={t('table.dueDate')} sortKey="date" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                    <SortHeader label={t('table.actions')} sortKey="action" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                    <SortHeader label={t('table.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                    <SortHeader label={t('common.box')} sortKey="status" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {openActions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-20 text-center text-slate-400">
                                            <p className="text-lg font-bold text-slate-300">{t('reports.noActionsFound')}</p>
                                        </td>
                                    </tr>
                                )}
                                {openActions.map((action, idx) => {
                                    const isOverdue = new Date(action.date) < new Date();
                                    return (
                                        <tr key={`${action.rca_id}-${idx}`} className="hover:bg-blue-50/30 transition-all">
                                            <td className={`px-8 py-6 font-mono text-xs ${isOverdue ? 'text-rose-600 font-black' : 'text-slate-400 font-bold'}`}>
                                                {action.date} {isOverdue && <span className="ml-3 text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-widest">{t('reports.overdue')}</span>}
                                            </td>
                                            <td className="px-8 py-6 max-w-xs truncate font-bold text-slate-800" title={action.action}>{action.action}</td>
                                            <td className="px-8 py-6 font-medium text-slate-500">{action.responsible}</td>
                                            <td className="px-8 py-6">{getStatusBadge(action.status)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };
