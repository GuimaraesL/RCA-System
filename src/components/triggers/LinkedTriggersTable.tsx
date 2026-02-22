/**
 * Proposta: Tabela compacta read-only de Gatilhos vinculados a uma RCA.
 * Fluxo: Exibe as mesmas colunas da TriggersList principal, mas sem paginacao, sort ou selecao.
 *        Permite abrir o modal de edicao ao clicar numa linha.
 */

import React from 'react';
import { TriggerRecord, AssetNode, TaxonomyConfig } from '../../types';
import { Check } from 'lucide-react';
import { getAssetName, getTaxonomyName, getFarol, getStatusColor } from '../../utils/triggerHelpers';
import { translateTriggerStatus } from '../../utils/statusUtils';
import { useLanguage } from '../../context/LanguageDefinition';
import { Badge } from '../ui/Badge';

interface LinkedTriggersTableProps {
    triggers: TriggerRecord[];
    assets: AssetNode[];
    taxonomy: TaxonomyConfig;
    onEdit: (t: TriggerRecord) => void;
}

export const LinkedTriggersTable: React.FC<LinkedTriggersTableProps> = ({
    triggers,
    assets,
    taxonomy,
    onEdit
}) => {
    const { t, formatDate } = useLanguage();

    if (triggers.length === 0) return null;

    const totalDuration = triggers.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-[13px] text-slate-600 dark:text-slate-300 border-separate border-spacing-0">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black">
                    <tr>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('triggersPage.table.status')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('table.status')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('table.date')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('filters.area')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('filters.equipment')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('filters.subgroup')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('table.duration')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('triggersPage.table.typeReason')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('table.type')}</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">{t('table.responsible')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {triggers.map(trigger => {
                        const farol = getFarol(trigger.start_date, trigger.status, taxonomy);
                        const statusName = translateTriggerStatus(trigger.status, getTaxonomyName(taxonomy.triggerStatuses || [], trigger.status), t);
                        const analysisTypeName = getTaxonomyName(taxonomy.analysisTypes || [], trigger.analysis_type_id);

                        return (
                            <tr
                                key={trigger.id}
                                className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 cursor-pointer transition-all group"
                                onClick={() => onEdit(trigger)}
                                title={t('triggersPage.tooltips.edit')}
                            >
                                <td className="px-4 py-3 text-center">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm border ${farol.color}`}>
                                        {farol.days === 'CHECK' ? <Check size={16} strokeWidth={3} /> : farol.days}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <Badge className={getStatusColor(trigger.status, taxonomy)}>
                                        {statusName}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatDate(trigger.start_date)}</td>
                                <td className="px-4 py-3 max-w-[120px] truncate font-bold text-slate-700 dark:text-slate-200" title={getAssetName(trigger.area_id, assets)}>{getAssetName(trigger.area_id, assets)}</td>
                                <td className="px-4 py-3 max-w-[120px] truncate font-bold text-slate-700 dark:text-slate-200" title={getAssetName(trigger.equipment_id, assets)}>{getAssetName(trigger.equipment_id, assets)}</td>
                                <td className="px-4 py-3 max-w-[120px] truncate font-bold text-slate-700 dark:text-slate-200" title={getAssetName(trigger.subgroup_id, assets)}>{getAssetName(trigger.subgroup_id, assets)}</td>
                                <td className="px-4 py-3 font-black text-slate-900 dark:text-white text-sm whitespace-nowrap">{trigger.duration_minutes || 0} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest">{t('common.minAbbr')}</span></td>
                                <td className="px-4 py-3 max-w-[180px]">
                                    <div className="font-black text-slate-800 dark:text-slate-100 uppercase text-[11px] tracking-tight">{trigger.stop_type || '-'}</div>
                                    <div className="truncate text-xs text-slate-400 dark:text-slate-500 font-medium" title={trigger.stop_reason}>{trigger.stop_reason || '-'}</div>
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{analysisTypeName}</td>
                                <td className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{trigger.responsible}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                        <td colSpan={6} className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.total')}</td>
                        <td className="px-4 py-2.5 font-black text-slate-900 dark:text-white text-sm">
                            {totalDuration} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest">{t('common.minAbbr')}</span>
                        </td>
                        <td colSpan={3}></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};
