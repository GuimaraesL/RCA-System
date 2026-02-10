
import React from 'react';
import { TriggerRecord, AssetNode, TaxonomyConfig, RcaRecord } from '../../types';
import { Plus, Edit2, Trash2, Link, FileText, Check } from 'lucide-react';
import { SortHeader } from '../ui/SortHeader';
import { getAssetName, getTaxonomyName, getFarol, getStatusColor } from '../../utils/triggerHelpers';
import { translateTriggerStatus } from '../../utils/statusUtils';
import { useLanguage } from '../../context/LanguageDefinition';

interface TriggersListProps {
    filteredTriggers: TriggerRecord[];
    currentPage: number;
    itemsPerPage: number;
    assets: AssetNode[];
    taxonomy: TaxonomyConfig;
    records: RcaRecord[]; // Used for linking display
    onEdit: (t: TriggerRecord) => void;
    onDelete: (id: string) => void;
    onLinkRca: (t: TriggerRecord) => void; // Open Link Modal
    onCreateRca: (t: TriggerRecord) => void;
    onOpenRca: (rcaId: string) => void;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    handleSort: (key: string) => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export const TriggersList: React.FC<TriggersListProps> = ({
    filteredTriggers,
    currentPage,
    itemsPerPage,
    assets,
    taxonomy,
    records,
    onEdit,
    onDelete,
    onLinkRca,
    onCreateRca,
    onOpenRca,
    sortConfig,
    handleSort,
    setCurrentPage
}) => {
    const { t, formatDate } = useLanguage();

    return (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-700 delay-200">
            <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10 group">
                        <tr>
                            <SortHeader label={t('triggersPage.table.status')} sortKey="start_date" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('table.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('table.date')} sortKey="start_date" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('filters.area')} sortKey="area_id" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('filters.equipment')} sortKey="equipment_id" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('filters.subgroup')} sortKey="subgroup_id" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('table.duration')} sortKey="duration_minutes" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('triggersPage.table.typeReason')} sortKey="stop_type" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('table.type')} sortKey="analysis_type_id" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('table.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} />
                            <SortHeader label={t('triggersPage.table.rcaLink')} sortKey="rca_id" currentSort={sortConfig} onSort={handleSort} />
                            <th className="px-4 py-3 text-right">{t('triggersPage.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTriggers.length === 0 && (
                            <tr>
                                <td colSpan={12} className="p-12 text-center text-slate-400">
                                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                    {t('triggersPage.noTriggers')}
                                </td>
                            </tr>
                        )}
                        {/* Pagination Logic */}
                        {filteredTriggers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(trigger => {
                            const farol = getFarol(trigger.start_date, trigger.status, taxonomy);
                            const assetName = getAssetName(trigger.subgroup_id || trigger.equipment_id || trigger.area_id, assets);
                            const analysisTypeName = getTaxonomyName(taxonomy.analysisTypes || [], trigger.analysis_type_id);
                            const linkedRca = records?.find(r => r.id === trigger.rca_id);
                            const statusName = translateTriggerStatus(trigger.status, getTaxonomyName(taxonomy.triggerStatuses || [], trigger.status), t);

                            return (
                                <tr 
                                    key={trigger.id} 
                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                    onClick={() => onEdit(trigger)}
                                >
                                    <td className="px-4 py-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${farol.color}`}>
                                            {farol.days === 'CHECK' ? <Check size={16} strokeWidth={3} /> : farol.days}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(trigger.status, taxonomy)}`}>
                                            {statusName}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono">{formatDate(trigger.start_date)}</td>
                                    <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(trigger.area_id, assets)}>{getAssetName(trigger.area_id, assets)}</td>
                                    <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(trigger.equipment_id, assets)}>{getAssetName(trigger.equipment_id, assets)}</td>
                                    <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(trigger.subgroup_id, assets)}>{getAssetName(trigger.subgroup_id, assets)}</td>
                                    <td className="px-4 py-3 font-bold">{trigger.duration_minutes} min</td>
                                    <td className="px-4 py-3 max-w-[200px]">
                                        <div className="font-bold text-slate-800">{trigger.stop_type}</div>
                                        <div className="truncate text-slate-400" title={trigger.stop_reason}>{trigger.stop_reason}</div>
                                    </td>
                                    <td className="px-4 py-3">{analysisTypeName}</td>
                                    <td className="px-4 py-3">{trigger.responsible}</td>
                                    <td className="px-4 py-3">
                                        {trigger.rca_id ? (
                                            <div
                                                className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded w-fit cursor-pointer hover:bg-blue-100 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); onOpenRca(trigger.rca_id!); }}
                                                title={t('triggersPage.tooltips.openRca')}
                                            >
                                                <Link size={12} /> {linkedRca?.what ? linkedRca.what.substring(0, 15) + '...' : `#RCA-${trigger.rca_id.substring(0, 4)}`}
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); onCreateRca(trigger); }} className="text-green-600 bg-green-50 hover:bg-green-100 p-1.5 rounded flex items-center gap-1" title={t('triggersPage.tooltips.createRca')}>
                                                    <Plus size={14} /> {t('triggersPage.buttons.new')}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onLinkRca(trigger); }}
                                                    className="text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1.5 rounded flex items-center gap-1 text-[10px]"
                                                    title={t('triggersPage.tooltips.linkRca')}
                                                >
                                                    <Link size={14} /> {t('triggersPage.linkTrigger')}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); onEdit(trigger); }} className="text-slate-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); onDelete(trigger.id); }} className="text-slate-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredTriggers.length > 0 && (
                    <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-slate-50">
                        <div className="text-sm text-slate-500">
                            {t('pagination.showing')} <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTriggers.length)}</span> {t('pagination.of')} <span className="font-medium">{filteredTriggers.length}</span> {t('pagination.results')}
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
                                onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredTriggers.length ? prev + 1 : prev))}
                                disabled={currentPage * itemsPerPage >= filteredTriggers.length}
                                className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                            >
                                {t('pagination.next')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
