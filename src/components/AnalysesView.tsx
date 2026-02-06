
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
// useEnterAnimation disabled for performance with large datasets
import { useLanguage } from '../context/LanguageDefinition'; // i18n

interface AnalysesViewProps {
    onNew: () => void;
    onEdit: (rec: RcaRecord) => void;
}

export const AnalysesView: React.FC<AnalysesViewProps> = ({ onNew, onEdit }) => {
    const { t, formatDate, language } = useLanguage();
    const { records, assets, taxonomy, deleteRecord } = useRcaContext();

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

    // --- Delete Handlers ---
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click from triggering edit
        setRecordToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;
        try {
            await deleteRecord(recordToDelete);
            console.log('✅ RCA excluída:', recordToDelete);
        } catch (error) {
            console.error('❌ Erro ao excluir RCA:', error);
        }
        setDeleteModalOpen(false);
        setRecordToDelete(null);
    };

    // --- Strict Cross-Filtering Logic for Options ---
    // --- Optimization: Pre-compute Search Context ---
    const recordsWithContext = useMemo(() => {
        return records.map(r => {
            const searchContext = `${r.what || ''} ${r.problem_description || ''} ${r.id || ''} ${r.who || ''} ${r.where_description || ''} ${r.participants?.join(' ') || ''} ${r.root_causes?.map((rc: any) => rc.cause).join(' ') || ''}`
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            const rDate = new Date(r.failure_date);
            const isValidDate = !isNaN(rDate.getTime());
            const yearStr = isValidDate ? rDate.getFullYear().toString() : '';
            const monthStr = isValidDate ? (rDate.getMonth() + 1).toString().padStart(2, '0') : '';

            return { ...r, searchContext, yearStr, monthStr };
        });
    }, [records]);

    const dynamicOptions = useMemo(() => {
        // Helper: Global filters (Date, Search)
        const matchesGlobal = (r: typeof recordsWithContext[0]) => {
            // Text Search
            const searchLower = filters.searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const matchesSearch = !filters.searchTerm || r.searchContext.includes(searchLower);

            // Date
            const matchesYear = !filters.year || r.yearStr === filters.year;
            const matchesMonth = filters.months.length === 0 || filters.months.includes(r.monthStr);

            return matchesSearch && matchesYear && matchesMonth;
        };

        // Helper: Asset filters
        const matchesAssets = (r: any) => {
            if (filters.subgroup !== 'ALL' && r.subgroup_id !== filters.subgroup) return false;
            if (filters.equipment !== 'ALL' && r.equipment_id !== filters.equipment) return false;
            if (filters.area !== 'ALL' && r.area_id !== filters.area) return false;
            return true;
        };

        // Helper: Attribute filters
        const matchesAttributes = (r: any, ignore: 'status' | 'type' | 'specialty' | null) => {
            if (ignore !== 'status' && filters.status !== 'ALL' && r.status !== filters.status) return false;
            if (ignore !== 'type' && filters.analysisType !== 'ALL' && r.analysis_type !== filters.analysisType) return false;
            if (ignore !== 'specialty' && filters.specialty !== 'ALL' && r.specialty_id !== filters.specialty) return false;
            return true;
        };

        // 1. Assets: Match Global + Attributes
        const recordsForAssets = recordsWithContext.filter(r => matchesGlobal(r) && matchesAttributes(r, null));
        const usedAssetIds = new Set<string>();
        recordsForAssets.forEach(r => {
            if (r.area_id) usedAssetIds.add(r.area_id);
            if (r.equipment_id) usedAssetIds.add(r.equipment_id);
            if (r.subgroup_id) usedAssetIds.add(r.subgroup_id);
        });

        // 2. Statuses: Match Global + Assets + Attributes(ignore Status)
        const recordsForStatuses = recordsWithContext.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'status'));
        const usedStatuses = new Set(recordsForStatuses.map(r => r.status));

        // 3. Specialties: Match Global + Assets + Attributes(ignore Specialty)
        const recordsForSpecialties = recordsWithContext.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'specialty'));
        const usedSpecialties = new Set(recordsForSpecialties.map(r => r.specialty_id));

        // 4. Types: Match Global + Assets + Attributes(ignore Type)
        const recordsForTypes = recordsWithContext.filter(r => matchesGlobal(r) && matchesAssets(r) && matchesAttributes(r, 'type'));
        const usedTypes = new Set(recordsForTypes.map(r => r.analysis_type));

        return {
            assets: filterAssetsByUsage(assets, usedAssetIds),
            statuses: taxonomy.analysisStatuses.filter(s => usedStatuses.has(s.id)),
            specialties: taxonomy.specialties.filter(s => usedSpecialties.has(s.id)),
            analysisTypes: taxonomy.analysisTypes.filter(t => usedTypes.has(t.id))
        };
    }, [recordsWithContext, assets, taxonomy, filters]);

    // --- Filtering Logic (View) --- 
    const filteredContent = useMemo(() => {
        // 1. Prepare Search Term (Normalized)
        const searchLower = filters.searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return recordsWithContext.filter(r => {
            // Text Search - O(1)
            const matchesSearch = !filters.searchTerm || r.searchContext.includes(searchLower);

            // Date - O(1)
            const matchesYear = !filters.year || r.yearStr === filters.year;
            const matchesMonth = filters.months.length === 0 || filters.months.includes(r.monthStr);

            // Dropdown Filters
            const matchesStatus = filters.status === 'ALL' || r.status === filters.status;
            const matchesType = filters.analysisType === 'ALL' || r.analysis_type === filters.analysisType;
            const matchesSpecialty = filters.specialty === 'ALL' || r.specialty_id === filters.specialty;

            // Assets Hierarchy
            let matchesAsset = true;
            if (filters.subgroup !== 'ALL') matchesAsset = r.subgroup_id === filters.subgroup;
            else if (filters.equipment !== 'ALL') matchesAsset = r.equipment_id === filters.equipment;
            else if (filters.area !== 'ALL') matchesAsset = r.area_id === filters.area;

            // --- Technical Filters (Dashboard Click-through) ---
            const matchesFailureMode = filters.failureMode === 'ALL' || r.failure_mode_id === filters.failureMode;
            const matchesFailureCategory = filters.failureCategory === 'ALL' || r.failure_category_id === filters.failureCategory;
            const matchesComponent = filters.componentType === 'ALL' || r.component_type === filters.componentType;

            let matches6M = true;
            if (filters.rootCause6M !== 'ALL') {
                matches6M = r.root_causes?.some((rc: any) => rc.root_cause_m_id === filters.rootCause6M);
            }

            return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesAsset && matchesType && matchesSpecialty
                && matchesFailureMode && matchesFailureCategory && matchesComponent && matches6M;
        });
    }, [recordsWithContext, filters]);

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
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs text-slate-500">{r.id}</div>
                                            <div className="text-xs font-bold text-blue-600">{getName('analysisTypes', r.analysis_type)}</div>
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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${r.status === STATUS_IDS.CONCLUDED ? 'bg-green-100 text-green-700' :
                                                r.status === STATUS_IDS.CANCELLED ? 'bg-red-100 text-red-700' :
                                                    r.status === STATUS_IDS.WAITING_VERIFICATION ? 'bg-purple-100 text-purple-700' :
                                                        r.status === STATUS_IDS.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-600'
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
