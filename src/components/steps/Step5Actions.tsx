/**
 * Proposta: Passo 5 do Wizard - Plano de Ações (CAPA).
 * Fluxo: Gerencia ações imediatas de contenção (internas ao registro) e orquestra a vinculação de planos de ação corretiva globais através de uma tabela interativa com suporte a ordenação e status de 'Box'.
 */

import React, { useRef, useId } from 'react';
import { RcaRecord, ActionRecord } from '../../types';
import { ClipboardList, Plus, Target, CheckCircle2, AlertTriangle, Edit2, Trash2, Clock, ShieldCheck, Award, Info } from 'lucide-react';
import { useSorting } from '../../hooks/useSorting';
import { SortHeader } from '../ui/SortHeader';
import { useLanguage } from '../../context/LanguageDefinition';
import { useEnterAnimation } from '../../hooks/useEnterAnimation';
import { ACTION_STATUS_IDS } from '../../constants/SystemConstants';

interface Step5Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    linkedActions: ActionRecord[];
    onAddActionPlan: (type: 'CORRECTIVE') => void;
    onEditActionPlan: (action: ActionRecord) => void;
    onDeleteActionPlan: (id: string) => void;
    isFieldRequired: (field: string) => boolean;
    errors?: Record<string, boolean>;
}

export const Step5Actions: React.FC<Step5Props> = ({
    data, onChange, linkedActions, onAddActionPlan, onEditActionPlan, onDeleteActionPlan, isFieldRequired, errors
}) => {
    const { t, formatDate } = useLanguage();
    const idPrefix = useId();

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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-[10px] font-black uppercase tracking-wider border border-primary-100 shadow-sm">
                        <ShieldCheck size={12} strokeWidth={3} />
                        {t('actionModal.statusOptions.completed')}
                    </span>
                );
            case ACTION_STATUS_IDS.VERIFIED:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border border-slate-200 shadow-sm">
                        <Award size={12} strokeWidth={3} />
                        {t('actionModal.statusOptions.verified')}
                    </span>
                );
            default: return <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-mono">{status || '-'}</span>;
        }
    };

    // --- Lógica de Ordenação de Ações ---
    const { sortedItems: sortedActions, sortConfig, handleSort } = useSorting(linkedActions, { key: 'status', direction: 'asc' });

    // Gestão de Ações Internas de Contenção
    const updateInternalAction = (index: number, field: string, val: string) => {
        if (!data.containment_actions) return;
        const list = [...data.containment_actions];
        list[index] = { ...list[index], [field]: val };
        onChange('containment_actions', list);
    };

    const addInternalAction = () => {
        const list = data.containment_actions || [];
        const newId = 'ACT-C-' + Date.now();
        onChange('containment_actions', [...list, { id: newId, action: '', responsible: '', date: '', status: 'PENDING' }]);
    };

    const removeInternalAction = (index: number) => {
        if (!data.containment_actions) return;
        const list = data.containment_actions.filter((_, i) => i !== index);
        onChange('containment_actions', list);
    };

    // Orquestração de animação para as linhas da tabela
    const listRef = useEnterAnimation([sortedActions]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Cabeçalho de Orientação */}
            <div className="bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800 p-6 rounded-xl flex gap-4 text-primary-800 dark:text-primary-200 text-sm shadow-sm">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-800/50 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
                    <Target size={24} />
                </div>
                <div>
                    <strong className="text-primary-900 dark:text-primary-100 font-bold block mb-1 text-base">{t('wizard.step5.header')}</strong>
                    <p className="font-medium opacity-80">{t('wizard.step5.headerDesc')}</p>
                </div>
            </div>

            {/* Ações Internas (Contenção Imediata) */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800">
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <AlertTriangle size={24} className="text-amber-500" /> {t('wizard.step5.containmentTitle')}
                    </h3>
                    <button onClick={addInternalAction} className="text-xs font-bold flex items-center gap-2 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 px-4 py-2 rounded-lg transition-all border border-primary-100 dark:border-primary-800">
                        <Plus size={16} /> {t('wizard.step5.containmentAdd')}
                    </button>
                </div>

                <div className="space-y-4">
                    {(!data.containment_actions || data.containment_actions.length === 0) && (
                        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm font-medium">
                            {t('wizard.step5.containmentEmpty')}
                        </div>
                    )}
                    {data.containment_actions?.map((action, idx) => (
                        <div key={idx} className="flex gap-6 items-start p-6 bg-slate-50/30 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 group hover:bg-white dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-300">
                            <div className="flex-1 space-y-2">
                                <label htmlFor={`${idPrefix}-cont-act-${idx}`} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('wizard.step5.whatAction')}</label>
                                <input
                                    id={`${idPrefix}-cont-act-${idx}`}
                                    name={`containment_action_${idx}_action`}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                                    placeholder={t('wizard.step5.whatPlaceholder')}
                                    value={action.action}
                                    onChange={e => updateInternalAction(idx, 'action', e.target.value)}
                                />
                            </div>
                            <div className="w-48 space-y-2">
                                <label htmlFor={`${idPrefix}-cont-resp-${idx}`} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('wizard.step5.whoResponsible')}</label>
                                <input
                                    id={`${idPrefix}-cont-resp-${idx}`}
                                    name={`containment_action_${idx}_responsible`}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                                    value={action.responsible}
                                    onChange={e => updateInternalAction(idx, 'responsible', e.target.value)}
                                />
                            </div>
                            <div className="w-48 space-y-2">
                                <label htmlFor={`${idPrefix}-cont-date-${idx}`} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('wizard.step5.whenDate')}</label>
                                <input
                                    id={`${idPrefix}-cont-date-${idx}`}
                                    name={`containment_action_${idx}_date`}
                                    type="date"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
                                    value={action.date}
                                    onChange={e => updateInternalAction(idx, 'date', e.target.value)}
                                />
                            </div>
                            <button onClick={() => removeInternalAction(idx)} className="mt-8 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ações Corretivas (Vinculadas Globalmente) */}
            <div className={`bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border relative transition-all ${errors?.actions ? 'border-rose-300 ring-4 ring-rose-50 dark:ring-rose-900/20' : 'border-slate-200/60 dark:border-slate-800'}`}>
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <CheckCircle2 size={24} className="text-emerald-500" /> {t('wizard.step5.correctiveTitle')} {isFieldRequired('actions') && <span className="text-rose-500">*</span>}
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onAddActionPlan('CORRECTIVE')}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm shadow-primary-500/20 transition-all"
                        >
                            <Plus size={18} /> {t('wizard.step5.correctiveAdd')}
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <SortHeader label={t('common.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} width="w-44" />
                                <SortHeader label={t('actionModal.actionDescription')} sortKey="action" currentSort={sortConfig} onSort={handleSort} width="w-1/2" />
                                <SortHeader label={t('actionModal.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('actionModal.dueDate')} sortKey="date" currentSort={sortConfig} onSort={handleSort} />
                                <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody ref={listRef as any} className="divide-y divide-slate-50 dark:divide-slate-800">
                            {sortedActions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-slate-500 italic bg-white dark:bg-slate-900 font-medium">
                                        {t('wizard.step5.correctiveEmpty')}
                                    </td>
                                </tr>
                            )}
                            {sortedActions.map(act => (
                                <tr
                                    key={act.id}
                                    className="hover:bg-primary-50/30 dark:hover:bg-primary-900/20 cursor-pointer transition-all opacity-0"
                                    onClick={() => onEditActionPlan(act)}
                                >
                                    <td className="px-6 py-4">
                                        {getStatusBadge(act.status)}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{act.action}</td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">{act.responsible}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400 dark:text-slate-500">{formatDate(act.date)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteActionPlan(act.id); }}
                                                className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};
