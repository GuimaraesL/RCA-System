/**
 * Proposta: Vista principal de listagem e gestão de Análises RCA.
 * Fluxo: Renderiza uma tabela interativa com suporte a ordenação, filtros cruzados inteligentes, paginação e integração com o contexto global de dados.
 */

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
import { translateStatus } from '../utils/statusUtils';
import { useFilteredData } from '../hooks/useFilteredData';
import { useLanguage } from '../context/LanguageDefinition'; 

interface AnalysesViewProps {
    onNew: () => void;
    onEdit: (rec: RcaRecord) => void;
}

export const AnalysesView: React.FC<AnalysesViewProps> = ({ onNew, onEdit }) => {
    const { t, formatDate, language } = useLanguage();
    const { records, assets, taxonomy, deleteRecord } = useRcaContext();

    // Estado para o modal de confirmação de exclusão
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

    // --- Gestão de Estado dos Filtros Persistentes ---
    const defaultFilters: FilterState = {
        searchTerm: '', year: '', months: [], status: 'ALL', area: 'ALL',
        equipment: 'ALL', subgroup: 'ALL', specialty: 'ALL', analysisType: 'ALL',
        failureMode: 'ALL', failureCategory: 'ALL', componentType: 'ALL', rootCause6M: 'ALL'
    };

    const { showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal } = useFilterPersistence(
        'rca_analyses_view_v3',
        defaultFilters,
        true
    );

    // Hook de filtragem inteligente (Cross-Filtering)
    const { filteredRCAs: filteredContent, availableOptions } = useFilteredData(filters);

    // --- Orquestradores de Exclusão ---
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Impede que o clique na linha dispare a edição
        setRecordToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;
        try {
            await deleteRecord(recordToDelete);
            console.log('✅ Contexto: RCA excluída com sucesso');
        } catch (error) {
            console.error('❌ Erro ao excluir RCA:', error);
        }
        setDeleteModalOpen(false);
        setRecordToDelete(null);
    };

    /**
     * OTIMIZAÇÃO DE PERFORMANCE: Cria mapas de busca O(1) para a taxonomia.
     * Evita loops .find() repetitivos durante a renderização de grandes tabelas.
     */
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

    const dynamicOptions = useMemo(() => {
        // Identifica IDs em uso para otimizar os filtros disponíveis na interface
        const usedAssetIds = new Set<string>();
        records.forEach(r => {
            if (r.area_id) usedAssetIds.add(r.area_id);
            if (r.equipment_id) usedAssetIds.add(r.equipment_id);
            if (r.subgroup_id) usedAssetIds.add(r.subgroup_id);
        });

        return {
            assets: filterAssetsByUsage(assets, usedAssetIds),
            statuses: taxonomy.analysisStatuses,
            specialties: taxonomy.specialties,
            analysisTypes: taxonomy.analysisTypes
        };
    }, [records, assets, taxonomy]);

    // Hook de ordenação de dados
    const { sortedItems: filteredRecords, sortConfig, handleSort } = useSorting(filteredContent, { key: 'failure_date', direction: 'desc' });

    // --- Gestão de Paginação ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    // Reseta para a primeira página sempre que os filtros mudarem
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    return (
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto h-full flex flex-col space-y-8">
            {/* Cabeçalho da Vista */}
            <div className="flex justify-between items-end flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 font-display tracking-tight">{t('analysesPage.title')}</h1>
                    <p className="text-slate-500 mt-2 font-medium">{t('analysesPage.subtitle')}</p>
                </div>
                <button
                    onClick={onNew}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                    <Plus size={20} strokeWidth={3} /> {t('analysesPage.newButton')}
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
                <FilterBar
                    isOpen={showFilters}
                    onToggle={() => setShowFilters(!showFilters)}
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={() => handleReset(defaultFilters)}
                    totalResults={filteredRecords.length}
                    config={{
                        showSearch: true, showDate: true, showStatus: true,
                        showAssetHierarchy: true, showAnalysisType: true,
                        showSpecialty: true, showComponentType: true
                    }}
                    options={{
                        statuses: dynamicOptions.statuses,
                        analysisTypes: dynamicOptions.analysisTypes,
                        specialties: dynamicOptions.specialties,
                        assets: dynamicOptions.assets,
                        failureModes: taxonomy.failureModes,
                        failureCategories: taxonomy.failureCategories,
                        componentTypes: taxonomy.componentTypes,
                        rootCause6Ms: taxonomy.rootCauseMs
                    }}
                    isGlobal={isGlobal}
                    onGlobalToggle={toggleGlobal}
                    availableOptions={availableOptions}
                />
            </div>

            {/* Tabela de Dados */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-1000 delay-200">
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600 border-separate border-spacing-0">
                        <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <SortHeader label={t('table.id') + " / " + t('table.type')} sortKey="id" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                <SortHeader label={t('table.what') + " / " + t('table.description')} sortKey="what" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                <SortHeader label={t('filters.sections.location')} sortKey="asset_name_display" currentSort={sortConfig} onSort={handleSort} width="w-64" className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                <SortHeader label={t('table.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                <SortHeader label={t('table.impact')} sortKey="financial_impact" currentSort={sortConfig} onSort={handleSort} className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                <SortHeader label={t('table.date')} sortKey="failure_date" currentSort={sortConfig} onSort={handleSort} width="w-40" className="px-8 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                                <th className="px-8 py-5 w-20 border-b border-slate-100 text-[10px] uppercase tracking-widest font-black text-slate-400 text-right">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center text-slate-400">
                                        <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                            <FileText size={40} className="opacity-20" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-300">{t('analysesPage.noRecords')}</p>
                                    </td>
                                </tr>
                            )}
                            {filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(r => {
                                const rawName = getName('analysisStatuses', r.status);
                                const statusName = translateStatus(r.status, rawName, t);
                                return (
                                    <tr key={r.id} onClick={() => onEdit(r)} className="hover:bg-blue-50/30 cursor-pointer transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="font-mono text-[10px] text-slate-400 group-hover:text-blue-500 transition-colors mb-1 font-bold">#RCA-{r.id.substring(0, 6)}</div>
                                            <div className="text-xs font-black text-slate-700 uppercase tracking-tight">{getName('analysisTypes', r.analysis_type)}</div>
                                        </td>
                                        <td className="px-8 py-6 max-w-sm">
                                            <div className="font-bold text-slate-900 truncate mb-1" title={r.what}>{r.what}</div>
                                            <div className="text-xs text-slate-400 truncate leading-relaxed" title={r.problem_description}>{r.problem_description}</div>
                                        </td>
                                        <td className="px-8 py-6 max-w-xs">
                                            <div className="text-slate-700 font-bold truncate mb-1" title={getAssetName(r.subgroup_id || r.equipment_id || r.area_id, assets) || r.asset_name_display}>
                                                {getAssetName(r.subgroup_id || r.equipment_id || r.area_id, assets) || r.asset_name_display || '-'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{getName('componentTypes', r.component_type)}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${r.status === STATUS_IDS.CONCLUDED ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm' :
                                                r.status === STATUS_IDS.CANCELLED ? 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm' :
                                                    r.status === STATUS_IDS.WAITING_VERIFICATION ? 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm' :
                                                        r.status === STATUS_IDS.IN_PROGRESS ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm' :
                                                            'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}>
                                                {statusName}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-slate-900 font-black text-base">
                                                <span className="text-[10px] text-slate-400 mr-1">{language === 'pt' ? 'R$' : '$'}</span>
                                                {r.financial_impact?.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.downtime_minutes} min total</div>
                                        </td>
                                        <td className="px-8 py-6 text-slate-500 font-medium whitespace-nowrap">
                                            {formatDate(r.failure_date)}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                data-testid="delete-rca-btn"
                                                onClick={(e) => handleDelete(e, r.id)}
                                                className="text-slate-300 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-all"
                                                title={t('analysesPage.tooltips.deleteRca')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {/* Controles de Paginação */}
                    {filteredRecords.length > 0 && (
                        <div className="p-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {t('pagination.showing')} <span className="text-slate-900 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="text-slate-900 font-black">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> {t('pagination.of')} <span className="text-slate-900 font-black">{filteredRecords.length}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all shadow-sm active:scale-95"
                                >
                                    {t('pagination.previous')}
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredRecords.length ? prev + 1 : prev))}
                                    disabled={currentPage * itemsPerPage >= filteredRecords.length}
                                    className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all shadow-sm active:scale-95"
                                >
                                    {t('pagination.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Confirmação de Exclusão */}
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