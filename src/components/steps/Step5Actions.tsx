/**
 * Proposta: Passo 5 do Wizard - Plano de Ações (CAPA).
 * Fluxo: Gerencia ações imediatas de contenção (internas ao registro) e orquestra a vinculação de planos de ação corretiva globais através de uma tabela interativa com suporte a ordenação e status de 'Box'.
 */

import React, { useRef } from 'react';
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
          default: return <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-500 text-[10px] font-mono">{status || '-'}</span>;
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
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Cabeçalho de Orientação */}
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex gap-3 text-indigo-700 text-sm">
                <Target size={20} className="mt-0.5" />
                <div>
                    <strong>{t('wizard.step5.header')}</strong>
                    <p>{t('wizard.step5.headerDesc')}</p>
                </div>
            </div>

            {/* Ações Internas (Contenção Imediata) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" /> {t('wizard.step5.containmentTitle')}
                    </h3>
                    <button onClick={addInternalAction} className="text-xs flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">
                        <Plus size={14} /> {t('wizard.step5.containmentAdd')}
                    </button>
                </div>

                <div className="space-y-3">
                    {(!data.containment_actions || data.containment_actions.length === 0) && (
                        <div className="text-center p-6 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-xs">
                            {t('wizard.step5.containmentEmpty')}
                        </div>
                    )}
                    {data.containment_actions?.map((action, idx) => (
                        <div key={idx} className="flex gap-4 items-start p-3 bg-slate-50 rounded border border-slate-100 group">
                            <div className="flex-1 space-y-2">
                                <label htmlFor={`containment_action_${idx}_action`} className="text-[10px] font-bold text-slate-400 uppercase">{t('wizard.step5.whatAction')}</label>
                                <input
                                    id={`containment_action_${idx}_action`}
                                    name={`containment_action_${idx}_action`}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder={t('wizard.step5.whatPlaceholder')}
                                    value={action.action}
                                    onChange={e => updateInternalAction(idx, 'action', e.target.value)}
                                />
                            </div>
                            <div className="w-32 space-y-2">
                                <label htmlFor={`containment_action_${idx}_responsible`} className="text-[10px] font-bold text-slate-400 uppercase">{t('wizard.step5.whoResponsible')}</label>
                                <input
                                    id={`containment_action_${idx}_responsible`}
                                    name={`containment_action_${idx}_responsible`}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={action.responsible}
                                    onChange={e => updateInternalAction(idx, 'responsible', e.target.value)}
                                />
                            </div>
                            <div className="w-32 space-y-2">
                                <label htmlFor={`containment_action_${idx}_date`} className="text-[10px] font-bold text-slate-400 uppercase">{t('wizard.step5.whenDate')}</label>
                                <input
                                    id={`containment_action_${idx}_date`}
                                    name={`containment_action_${idx}_date`}
                                    type="date"
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={action.date}
                                    onChange={e => updateInternalAction(idx, 'date', e.target.value)}
                                />
                            </div>
                            <button onClick={() => removeInternalAction(idx)} className="mt-6 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ações Corretivas (Vinculadas Globalmente) */}
            <div className={`bg-white p-6 rounded-lg shadow-sm border relative ${errors?.actions ? 'border-red-500 ring-2 ring-red-50' : 'border-slate-200'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-green-600" /> {t('wizard.step5.correctiveTitle')} {isFieldRequired('actions') && <span className="text-red-500">*</span>}
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onAddActionPlan('CORRECTIVE')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <Plus size={14} /> {t('wizard.step5.correctiveAdd')}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <SortHeader label={t('common.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} width="w-40" />
                                <SortHeader label={t('actionModal.actionDescription')} sortKey="action" currentSort={sortConfig} onSort={handleSort} width="w-1/2" />
                                <SortHeader label={t('actionModal.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('actionModal.dueDate')} sortKey="date" currentSort={sortConfig} onSort={handleSort} />
                                <th className="px-4 py-2 text-right"></th>
                            </tr>
                        </thead>
                        <tbody ref={listRef as any} className="divide-y divide-slate-100">
                            {sortedActions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-400 italic bg-slate-50/50">
                                        {t('wizard.step5.correctiveEmpty')}
                                    </td>
                                </tr>
                            )}
                            {sortedActions.map(act => (
                                <tr
                                    key={act.id}
                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors opacity-0"
                                    onClick={() => onEditActionPlan(act)}
                                >
                                    <td className="px-4 py-2">
                                        {getStatusBadge(act.status)}
                                    </td>
                                    <td className="px-4 py-2 font-medium text-slate-800">{act.action}</td>
                                    <td className="px-4 py-2 text-xs">{act.responsible}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{formatDate(act.date)}</td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditActionPlan(act); }}
                                                className="text-slate-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteActionPlan(act.id); }}
                                                className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={14} />
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