
import React, { useMemo } from 'react';
import { RcaRecord, ActionRecord } from '../types';
import { STATUS_IDS } from '../constants/SystemConstants';
import { ArrowUp, ArrowDown, Activity, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useSorting } from '../hooks/useSorting';
import { SortHeader } from './ui/SortHeader';
import { useLanguage } from '../context/LanguageDefinition';

interface ReportsViewProps {
    records: RcaRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ records }) => {
    const { t } = useLanguage();

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

    // Apply Filters to get Base Records
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const searchLower = filters.searchTerm.toLowerCase();
            const matchesSearch = !filters.searchTerm ||
                r.what?.toLowerCase().includes(searchLower) ||
                r.problem_description?.toLowerCase().includes(searchLower) ||
                r.id.toLowerCase().includes(searchLower);

            const rDate = new Date(r.failure_date);
            const matchesYear = !filters.year || rDate.getFullYear().toString() === filters.year;

            const rMonth = (rDate.getMonth() + 1).toString().padStart(2, '0');
            const matchesMonth = filters.months.length === 0 || filters.months.includes(rMonth);

            const matchesStatus = filters.status === 'ALL' || r.status === filters.status;
            const matchesType = filters.analysisType === 'ALL' || r.analysis_type === filters.analysisType;

            // Simplified Asset Matches for Report (Can expand if needed)
            let matchesAsset = true;
            if (filters.subgroup !== 'ALL') matchesAsset = r.subgroup_id === filters.subgroup;
            else if (filters.equipment !== 'ALL') matchesAsset = r.equipment_id === filters.equipment;
            else if (filters.area !== 'ALL') matchesAsset = r.area_id === filters.area;

            return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesType && matchesAsset;
        });
    }, [records, filters]);


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
        <div className="p-8 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('reports.title')}</h1>
                    <p className="text-slate-500">{t('reports.subtitle')}</p>
                    <div className="text-xs text-slate-500 mb-1">{t('common.box')}</div>
                    {t('reports.lastUpdated')}: {new Date().toLocaleDateString()}
                </div>
            </div>

            <FilterBar
                isOpen={showFilters}
                onToggle={() => setShowFilters(!showFilters)}
                filters={filters}
                onFilterChange={setFilters}
                onReset={() => handleReset(defaultFilters)}
                totalResults={filteredRecords.length}
                config={{ showDate: true, showStatus: true, showSearch: true, showAnalysisType: true, showAssetHierarchy: true }}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20} /></div>
                        {overdueActions.length > 0 && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full animate-pulse">{overdueActions.length} {t('reports.overdue')}</span>}
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{filteredRecords.length}</div>
                    <div className="text-sm text-slate-500 font-medium">{t('reports.totalAnalyses')}</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertCircle size={20} /></div>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{totalOpen}</div>
                    <div className="text-sm text-slate-500 font-medium">{t('reports.openAnalyses')}</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={20} /></div>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{totalClosed}</div>
                    <div className="text-sm text-slate-500 font-medium">{t('reports.concluded')}</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Calendar size={20} /></div>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{openActions.length}</div>
                    <div className="text-sm text-slate-500 font-medium">{t('reports.pendingActions')}</div>
                </div>
            </div>

            {/* Actions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500" /> {t('reports.filteredActionsTitle')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 group">
                            <tr>
                                <SortHeader label={t('table.dueDate')} sortKey="date" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.actions')} sortKey="action" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('common.box')} sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {openActions.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">{t('reports.noActionsFound')}</td></tr>
                            )}
                            {openActions.map((action, idx) => {
                                const isOverdue = new Date(action.date) < new Date();
                                return (
                                    <tr key={`${action.rca_id}-${idx}`} className="hover:bg-slate-50">
                                        <td className={`px-6 py-4 font-mono ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                                            {action.date} {isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded">{t('reports.overdue')}</span>}
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={action.action}>{action.action}</td>
                                        <td className="px-6 py-4">{action.responsible}</td>
                                        <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium">{t('common.box')} {action.status}</span></td>
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
