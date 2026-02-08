
import React, { useMemo, useState } from 'react';
import { RcaRecord, TaxonomyConfig } from '../types';
import { STATUS_IDS } from '../constants/SystemConstants';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { SortHeader } from './ui/SortHeader';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useSorting } from '../hooks/useSorting';
import { useRcaContext } from '../context/RcaContext';
import { filterAssetsByUsage } from '../services/utils';
import { ConfirmModal } from './ConfirmModal';
import { getAssetName } from '../utils/triggerHelpers';
import { useFilteredData } from '../hooks/useFilteredData';
// useEnterAnimation disabled for performance with large datasets
import { useLanguage } from '../context/LanguageDefinition'; // i18n

interface AnalysesViewProps {
    onNew: () => void;
    onEdit: (rec: RcaRecord) => void;
}

export const AnalysesView: React.FC<AnalysesViewProps> = ({ onNew, onEdit }) => {
    const { t, formatDate, language } = useLanguage();
    const { assets, taxonomy, deleteRecord } = useRcaContext();

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

    // --- Persistent Filter State ---
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

    const { showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal } = useFilterPersistence(
        'rca_analyses_view_v3',
        defaultFilters,
        true
    );

    // --- Intelligent Cross-Filtering Hook ---
    const { filteredRCAs: filteredContent } = useFilteredData(filters);

    // --- Performance Optimization: Taxonomy Maps for O(1) Lookup ---
    const taxonomyMaps = useMemo(() => {
        const maps: Record<string, Map<string, string>> = {};
        if (taxonomy) {
            Object.keys(taxonomy).forEach(key => {
                const list = (taxonomy as any)[key];
                if (Array.isArray(list)) {
                    maps[key] = new Map(list.map((item: any) => [item.id, item.name]));
                }
            });
        }
        return maps;
    }, [taxonomy]);

    const getName = (type: keyof TaxonomyConfig, id: string) => {
        if (!id || !taxonomyMaps[type]) return id;
        return taxonomyMaps[type].get(id) || id;
    };

    // Helper to translate statuses (Consistency with Dashboard)
    const translateStatus = (id: string, name: string) => {
        switch (id) {
            case STATUS_IDS.IN_PROGRESS: return t('status.inProgress');
            case STATUS_IDS.CONCLUDED: return t('status.completed');
            case STATUS_IDS.WAITING_VERIFICATION: return t('status.waiting');
            case STATUS_IDS.CANCELLED: return t('status.canceled');
            case STATUS_IDS.DELAYED: return t('status.delayed');
            default: return name || id;
        }
    };

    const dynamicOptions = useMemo(() => {
        return {
            assets: filterAssetsByUsage(assets, new Set()),
            statuses: taxonomy.analysisStatuses,
            specialties: taxonomy.specialties,
            analysisTypes: taxonomy.analysisTypes
        };
    }, [assets, taxonomy]);

    // Use the Hook!
    const { sortedItems: filteredRecords, sortConfig, handleSort } = useSorting(filteredContent, { key: 'failure_date', direction: 'desc' });

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    // Animation Ref
    // Animation Disabled (Performance Optimization)
    // const listRef = useEnterAnimation([filteredRecords, currentPage]);

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t('analysesPage.title')}</h1>
                    <p className="text-slate-500 mt-1">{t('analysesPage.subtitle')}</p>
                </div>
                <button
                    onClick={onNew}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
                >
                    <Plus size={18} /> {t('analysesPage.newButton')}
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
                <FilterBar
                    isOpen={showFilters}
                    onToggle={() => setShowFilters(!showFilters)}
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={() => handleReset(defaultFilters)}
                    totalResults={filteredRecords.length}
                    config={{
                        showSearch: true,
                        showDate: true,
                        showStatus: true,
                        showAssetHierarchy: true,
                        showAnalysisType: true,
                        showSpecialty: true
                    }}
                    options={{
                        statuses: dynamicOptions.statuses,
                        analysisTypes: dynamicOptions.analysisTypes,
                        specialties: dynamicOptions.specialties,
                        assets: dynamicOptions.assets
                    }}
                    isGlobal={isGlobal}
                    onGlobalToggle={toggleGlobal}
                />
            </div>

            {/* Data Table */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-700 delay-200">
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10 group">
                            <tr>
                                <SortHeader label={t('table.id') + " / " + t('table.type')} sortKey="id" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.what') + " / " + t('table.description')} sortKey="what" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('filters.sections.location')} sortKey="asset_name_display" currentSort={sortConfig} onSort={handleSort} width="w-48" />
                                <SortHeader label={t('table.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.impact')} sortKey="financial_impact" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.date')} sortKey="failure_date" currentSort={sortConfig} onSort={handleSort} width="w-32" />
                                <th className="px-6 py-4 w-16">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400">
                                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                        {t('analysesPage.noRecords')}
                                    </td>
                                </tr>
                            )}
                            {filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(r => {
                                const rawName = getName('analysisStatuses', r.status);
                                const statusName = translateStatus(r.status, rawName);
                                return (
                                    <tr key={r.id} onClick={() => onEdit(r)} className="hover:bg-blue-50 cursor-pointer transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="font-mono text-[10px] text-slate-400 group-hover:text-blue-400 transition-colors">#RCA-{r.id.substring(0, 6)}</div>
                                            <div className="text-xs font-bold text-blue-600 uppercase tracking-tight">{getName('analysisTypes', r.analysis_type)}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-sm">
                                            <div className="font-medium text-slate-900 truncate" title={r.what}>{r.what}</div>
                                            <div className="text-xs text-slate-400 truncate" title={r.problem_description}>{r.problem_description}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="text-slate-700 truncate" title={getAssetName(r.subgroup_id || r.equipment_id || r.area_id, assets) || r.asset_name_display}>
                                                {getAssetName(r.subgroup_id || r.equipment_id || r.area_id, assets) || r.asset_name_display || '-'}
                                            </div>
                                            <div className="text-xs text-slate-400 truncate">{getName('componentTypes', r.component_type)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${r.status === STATUS_IDS.CONCLUDED ? 'bg-status-concluded/10 text-status-concluded border border-status-concluded/20' :
                                                r.status === STATUS_IDS.CANCELLED ? 'bg-status-delayed/10 text-status-delayed border border-status-delayed/20' :
                                                    r.status === STATUS_IDS.WAITING_VERIFICATION ? 'bg-status-wait/10 text-status-wait border border-status-wait/20' :
                                                        r.status === STATUS_IDS.IN_PROGRESS ? 'bg-status-in-progress/10 text-status-in-progress border border-status-in-progress/20' :
                                                            'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                {statusName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900 font-medium">
                                                {language === 'pt' ? 'R$ ' : '$'}
                                                {r.financial_impact?.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-slate-400">{r.downtime_minutes} min</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {formatDate(r.failure_date)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                data-testid="delete-rca-btn"
                                                onClick={(e) => handleDelete(e, r.id)}
                                                className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                                                title={t('analysesPage.tooltips.deleteRca')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredRecords.length > 0 && (
                        <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-slate-50">
                            <div className="text-sm text-slate-500">
                                {t('pagination.showing')} <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> {t('pagination.of')} <span className="font-medium">{filteredRecords.length}</span> {t('pagination.results')}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                                >
                                    {t('pagination.previous')}
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredRecords.length ? prev + 1 : prev))}
                                    disabled={currentPage * itemsPerPage >= filteredRecords.length}
                                    className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                                >
                                    {t('pagination.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onCancel={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('modals.deleteTitle')}
                message={t('modals.deleteRcaMessage')}
                confirmText={t('modals.delete')}
            />
        </div >
    );
};
