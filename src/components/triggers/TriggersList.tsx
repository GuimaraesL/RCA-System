/**
 * Proposta: Componente de listagem tabular para Gatilhos (Triggers) de parada.
 * Fluxo: Renderiza uma tabela interativa com indicadores de Farol (SLA), status dinâmicos e ferramentas de conversão/vinculação com análises RCA.
 */

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
    records: RcaRecord[]; 
    onEdit: (t: TriggerRecord) => void;
    onDelete: (id: string) => void;
    onLinkRca: (t: TriggerRecord) => void; 
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
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-700 delay-200">
            <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-[13px] text-slate-600 border-separate border-spacing-0">
                    <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                            <SortHeader label={t('triggersPage.table.status')} sortKey="start_date" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('table.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('table.date')} sortKey="start_date" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('filters.area')} sortKey="area_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('filters.equipment')} sortKey="equipment_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('filters.subgroup')} sortKey="subgroup_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('table.duration')} sortKey="duration_minutes" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('triggersPage.table.typeReason')} sortKey="stop_type" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('table.type')} sortKey="analysis_type_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('table.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <SortHeader label={t('triggersPage.table.rcaLink')} sortKey="rca_id" currentSort={sortConfig} onSort={handleSort} className="px-6 py-5 text-[10px] uppercase tracking-widest border-b border-slate-100" />
                            <th className="px-6 py-5 text-right border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredTriggers.length === 0 && (
                            <tr>
                                <td colSpan={12} className="p-20 text-center text-slate-400">
                                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <FileText size={40} className="opacity-20" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-300">{t('triggersPage.noTriggers')}</p>
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

                            return (
                                <tr 
                                    key={trigger.id} 
                                    className="hover:bg-blue-50/30 cursor-pointer transition-all group"
                                    onClick={() => onEdit(trigger)}
                                >
                                    <td className="px-6 py-5 text-center">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border ${farol.color}`}>
                                            {farol.days === 'CHECK' ? <Check size={18} strokeWidth={3} /> : farol.days}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(trigger.status, taxonomy)}`}>
                                            {statusName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-400 whitespace-nowrap">{formatDate(trigger.start_date)}</td>
                                    <td className="px-6 py-5 max-w-[150px] truncate font-bold text-slate-700" title={getAssetName(trigger.area_id, assets)}>{getAssetName(trigger.area_id, assets)}</td>
                                    <td className="px-6 py-5 max-w-[150px] truncate font-bold text-slate-700" title={getAssetName(trigger.equipment_id, assets)}>{getAssetName(trigger.equipment_id, assets)}</td>
                                    <td className="px-6 py-5 max-w-[150px] truncate font-bold text-slate-700" title={getAssetName(trigger.subgroup_id, assets)}>{getAssetName(trigger.subgroup_id, assets)}</td>
                                    <td className="px-6 py-5 font-black text-slate-900 text-sm whitespace-nowrap">{trigger.duration_minutes} <span className="text-[10px] text-slate-400 font-bold tracking-widest">MIN</span></td>
                                    <td className="px-6 py-5 max-w-[200px]">
                                        <div className="font-black text-slate-800 uppercase text-[11px] tracking-tight">{trigger.stop_type}</div>
                                        <div className="truncate text-xs text-slate-400 font-medium" title={trigger.stop_reason}>{trigger.stop_reason}</div>
                                    </td>
                                    <td className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-tight">{analysisTypeName}</td>
                                    <td className="px-6 py-5 text-xs font-medium text-slate-500">{trigger.responsible}</td>
                                    <td className="px-6 py-5">
                                        {trigger.rca_id ? (
                                            <div
                                                className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg w-fit cursor-pointer hover:bg-blue-100 transition-all shadow-sm"
                                                onClick={(e) => { e.stopPropagation(); onOpenRca(trigger.rca_id!); }}
                                                title={t('triggersPage.tooltips.openRca')}
                                            >
                                                <Link size={14} strokeWidth={3} /> {linkedRca?.what ? linkedRca.what.substring(0, 15) + '...' : `#RCA-${trigger.rca_id.substring(0, 4)}`}
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); onCreateRca(trigger); }} className="text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 p-2 rounded-lg transition-all shadow-sm" title={t('triggersPage.tooltips.createRca')}>
                                                    <Plus size={16} strokeWidth={3} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onLinkRca(trigger); }}
                                                    className="text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-lg transition-all shadow-sm"
                                                    title={t('triggersPage.tooltips.linkRca')}
                                                >
                                                    <Link size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); onEdit(trigger); }} className="text-slate-300 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-all"><Edit2 size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); onDelete(trigger.id); }} className="text-slate-300 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                
                {/* Rodapé de Paginação */}
                {filteredTriggers.length > 0 && (
                    <div className="p-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {t('pagination.showing')} <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredTriggers.length)}</span> {t('pagination.of')} <span className="text-slate-900">{filteredTriggers.length}</span>
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
                                onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredTriggers.length ? prev + 1 : prev))}
                                disabled={currentPage * itemsPerPage >= filteredTriggers.length}
                                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all shadow-sm active:scale-95"
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