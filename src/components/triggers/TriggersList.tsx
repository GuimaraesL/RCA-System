/**
 * Proposta: Componente de listagem tabular para Gatilhos (Triggers) de parada.
 * Fluxo: Renderiza uma tabela interativa com indicadores de Farol (SLA), status dinâmicos e ferramentas de conversão/vinculação com análises RCA.
 */

import React from 'react';
import { TriggerRecord, AssetNode, TaxonomyConfig, RcaRecord } from '../../types';
import { Plus, Edit2, Trash2, Link, FileText, Check, X } from 'lucide-react';
import { SortHeader } from '../ui/SortHeader';
import { getAssetName, getTaxonomyName, getFarol } from '../../utils/triggerHelpers';
import { translateTriggerStatus } from '../../utils/statusUtils';
import { useLanguage } from '../../context/LanguageDefinition';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';

interface TriggersListProps {
    filteredTriggers: TriggerRecord[];
    currentPage: number;
    itemsPerPage: number;
    assets: AssetNode[];
    taxonomy: TaxonomyConfig;
    records: RcaRecord[];
    onEdit: (t: TriggerRecord) => void;
    onDelete: (id: string) => void;
    onLinkRca: (t: TriggerRecord) => void;
    onUnlinkRca: (t: TriggerRecord) => void;
    onCreateRca: (t: TriggerRecord) => void;
    onOpenRca: (rcaId: string) => void;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    handleSort: (key: string) => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    // Selecao multipla (Issue #80)
    selectedTriggerIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
    canSelectTrigger: (t: TriggerRecord) => boolean;
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
    onUnlinkRca,
    onCreateRca,
    onOpenRca,
    sortConfig,
    handleSort,
    setCurrentPage,
    selectedTriggerIds,
    onToggleSelect,
    onSelectAll,
    canSelectTrigger
}) => {
    const { t, formatDate } = useLanguage();

    return (
        <Card padding="none" className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-700 delay-200">
            <div className="overflow-auto flex-1 custom-scrollbar" data-testid="rca-table-container">
                <table className="w-full text-left text-[13px] text-slate-600 dark:text-slate-300 border-separate border-spacing-0" data-testid="rca-table">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-5 text-center border-b border-slate-100 dark:border-slate-700 w-12">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    onChange={(e) => { e.stopPropagation(); onSelectAll(); }}
                                    checked={filteredTriggers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).filter(t => canSelectTrigger(t)).length > 0 && filteredTriggers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).filter(t => canSelectTrigger(t)).every(t => selectedTriggerIds.has(t.id))}
                                    data-testid="checkbox-select-all"
                                />
                            </th>
                            <SortHeader label={t('triggersPage.table.status')} sortKey="start_date" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('table.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('table.date')} sortKey="start_date" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('filters.area')} sortKey="area_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('filters.equipment')} sortKey="equipment_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('filters.subgroup')} sortKey="subgroup_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('table.duration')} sortKey="duration_minutes" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('triggersPage.table.typeReason')} sortKey="stop_type" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('table.type')} sortKey="analysis_type_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('table.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <SortHeader label={t('triggersPage.table.rcaLink')} sortKey="rca_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700" />
                            <th className="px-6 py-5 text-right border-b border-slate-100 dark:border-slate-700 font-black text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('table.actions') || 'Acoes'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filteredTriggers.length === 0 && (
                            <tr>
                                <td colSpan={13} className="p-20 text-center text-slate-400 dark:text-slate-600">
                                    <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <FileText size={40} className="opacity-20" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-300 dark:text-slate-500">{t('triggersPage.noTriggers')}</p>
                                </td>
                            </tr>
                        )}

                        {/* Lógica de Paginação e Renderização de Linhas */}
                        {filteredTriggers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(trigger => {
                            const farol = getFarol(trigger.start_date, trigger.status, taxonomy);
                            const assetName = getAssetName(trigger.subgroup_id || trigger.equipment_id || trigger.area_id, assets);
                            const analysisTypeName = getTaxonomyName(taxonomy.analysisTypes || [], trigger.analysis_type_id);
                            const linkedRca = records?.find(r => r.id === trigger.rca_id);
                            const statusName = translateTriggerStatus(trigger.status, getTaxonomyName(taxonomy.triggerStatuses || [], trigger.status), t);
                            const isSelectable = canSelectTrigger(trigger);
                            const isSelected = selectedTriggerIds.has(trigger.id);

                            return (
                                <tr
                                    key={trigger.id}
                                    className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/50 cursor-pointer transition-all group border-b border-slate-50 dark:border-slate-800 last:border-0 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    onClick={() => onEdit(trigger)}
                                >
                                    <td className="px-4 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className={`h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'}`}
                                            checked={isSelected}
                                            disabled={!isSelectable && !isSelected}
                                            onChange={() => onToggleSelect(trigger.id)}
                                            data-testid={`checkbox-trigger-${trigger.id}`}
                                        />
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border ${farol.color}`}>
                                            {farol.days === 'CHECK' ? <Check size={18} strokeWidth={3} /> : farol.days}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge statusId={trigger.status} label={statusName} />
                                    </td>
                                    <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatDate(trigger.start_date)}</td>
                                    <td className="px-6 py-5 max-w-[150px] truncate font-bold text-slate-700 dark:text-slate-200" title={getAssetName(trigger.area_id, assets)}>{getAssetName(trigger.area_id, assets)}</td>
                                    <td className="px-6 py-5 max-w-[150px] truncate font-bold text-slate-700 dark:text-slate-200" title={getAssetName(trigger.equipment_id, assets)}>{getAssetName(trigger.equipment_id, assets)}</td>
                                    <td className="px-6 py-5 max-w-[150px] truncate font-bold text-slate-700 dark:text-slate-200" title={getAssetName(trigger.subgroup_id, assets)}>{getAssetName(trigger.subgroup_id, assets)}</td>
                                    <td className="px-6 py-5 font-black text-slate-900 dark:text-white text-sm whitespace-nowrap">{trigger.duration_minutes} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest">MIN</span></td>
                                    <td className="px-6 py-5 max-w-[200px]">
                                        <div className="font-black text-slate-800 dark:text-slate-100 uppercase text-[11px] tracking-tight">{trigger.stop_type}</div>
                                        <div className="truncate text-xs text-slate-400 dark:text-slate-500 font-medium" title={trigger.stop_reason}>{trigger.stop_reason}</div>
                                    </td>
                                    <td className="px-6 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{analysisTypeName}</td>
                                    <td className="px-6 py-5 text-xs font-medium text-slate-500 dark:text-slate-400">{trigger.responsible}</td>
                                    <td className="px-6 py-5">
                                        {trigger.rca_id ? (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 px-3 py-1.5 rounded-lg w-fit cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800 transition-all shadow-sm"
                                                    onClick={(e) => { e.stopPropagation(); onOpenRca(trigger.rca_id!); }}
                                                    title={t('triggersPage.tooltips.openRca')}
                                                >
                                                    <Link size={14} strokeWidth={3} /> {linkedRca?.what ? (linkedRca.what.length > 15 ? linkedRca.what.substring(0, 15) + '...' : linkedRca.what) : `#RCA-${trigger.rca_id.substring(0, 4)}`}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onLinkRca(trigger); }}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                    title={t('triggersPage.tooltips.linkRca') || 'Trocar Vínculo'}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onUnlinkRca(trigger); }}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                                    title={t('common.remove') || 'Remover Vínculo'}
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); onCreateRca(trigger); }} data-testid="btn-convert-trigger-to-rca" className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-800 p-2 rounded-lg transition-all shadow-sm" title={t('triggersPage.tooltips.createRca')}>
                                                    <Plus size={16} strokeWidth={3} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onLinkRca(trigger); }}
                                                    className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 p-2 rounded-lg transition-all shadow-sm"
                                                    title={t('triggersPage.tooltips.linkRca')}
                                                >
                                                    <Link size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); onEdit(trigger); }} className="text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"><Edit2 size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); onDelete(trigger.id); }} className="text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Rodapé de Paginação */}
                {filteredTriggers.length > 0 && (
                    <div className="p-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            {t('pagination.showing')} <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredTriggers.length)}</span> {t('pagination.of')} <span className="text-slate-900 dark:text-white">{filteredTriggers.length}</span>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-5 uppercase tracking-widest"
                                title="←"
                            >
                                {t('pagination.previous')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredTriggers.length ? prev + 1 : prev))}
                                disabled={currentPage * itemsPerPage >= filteredTriggers.length}
                                className="px-5 uppercase tracking-widest"
                                title="→"
                            >
                                {t('pagination.next')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
