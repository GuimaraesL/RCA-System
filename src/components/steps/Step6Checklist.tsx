/**
 * Proposta: Passo 6 do Wizard - Manutenção de Precisão (Checklist).
 * Fluxo: Renderiza uma lista de verificação técnica para garantir que os padrões de manutenção foram seguidos, com cálculo de progresso em tempo real e suporte a comentários individuais por item.
 */

import React, { useId } from 'react';
import { RcaRecord } from '../../types';
import { ListChecks, CheckSquare, Square, XSquare } from 'lucide-react';
import { useSorting } from '../../hooks/useSorting';
import { SortHeader } from '../ui/SortHeader';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step6Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    isFieldRequired?: (field: string) => boolean;
    errors?: Record<string, boolean>;
}

export const Step6Checklist: React.FC<Step6Props> = ({ data, onChange, isFieldRequired, errors }) => {
    const { t } = useLanguage();
    const idPrefix = useId();

    const updatePrecision = (id: string, field: 'status' | 'comment', value: any) => {
        if (!data.precision_maintenance) return;
        const newList = data.precision_maintenance.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        onChange('precision_maintenance', newList);
    };

    // Cálculo do progresso da verificação técnica
    const total = data.precision_maintenance?.length || 0;
    const completed = data.precision_maintenance?.filter(i => i.status !== '').length || 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Lógica de ordenação da tabela
    const { sortedItems: precisionMaintenance, sortConfig, handleSort } = useSorting<any>(data.precision_maintenance || [], { key: 'activity', direction: 'asc' });

    if (!data.precision_maintenance) return null;

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Cabeçalho e Barra de Progresso */}
            <div className={`bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border ${errors?.precision_maintenance ? 'border-rose-300 dark:border-rose-700 ring-4 ring-rose-50 dark:ring-rose-900/20' : 'border-slate-200/60 dark:border-slate-800'} flex items-center justify-between gap-10 transition-all`}>
                <div className="flex items-center gap-5">
                    <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl text-primary-600 dark:text-primary-400 shadow-sm border border-primary-100 dark:border-primary-800">
                        <ListChecks size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                            {t('wizard.step6.title')} {isFieldRequired && isFieldRequired('precision_maintenance') && <span className="text-rose-500">*</span>}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('wizard.step6.subtitle')}</p>
                    </div>
                </div>

                <div className="flex-1 max-w-md">
                    <div className="flex justify-between text-[10px] mb-2 font-black uppercase tracking-widest">
                        <span className="text-slate-400 dark:text-slate-500">{t('wizard.step6.completionStatus')}</span>
                        <span className="text-primary-600 dark:text-primary-400">{percent}% ({completed}/{total})</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                        <div
                            className="bg-primary-600 dark:bg-primary-500 h-full rounded-full transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Tabela de Atividades */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                            <SortHeader label={t('wizard.step6.activity')} sortKey="activity" currentSort={sortConfig} onSort={handleSort} className="px-6 py-4 font-black text-[10px] uppercase tracking-widest" />
                            <th className="px-4 py-4 w-24 text-center font-black text-[10px] uppercase tracking-widest">{t('wizard.step6.executed')}</th>
                            <th className="px-4 py-4 w-24 text-center font-black text-[10px] uppercase tracking-widest">{t('wizard.step6.notExecuted')}</th>
                            <th className="px-4 py-4 w-24 text-center font-black text-[10px] uppercase tracking-widest">{t('wizard.step6.notApplicable')}</th>
                            <SortHeader label={t('wizard.step6.comment')} sortKey="comment" currentSort={sortConfig} onSort={handleSort} className="px-6 py-4 font-black text-[10px] uppercase tracking-widest" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {precisionMaintenance.map((item) => (
                            <tr key={item.id} className="hover:bg-primary-50/20 dark:hover:bg-primary-900/10 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                                    {t(item.activity || '')}
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <button
                                        onClick={() => updatePrecision(item.id, 'status', 'EXECUTED')}
                                        className={`p-2 rounded-lg transition-all ${item.status === 'EXECUTED' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 shadow-sm' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500'}`}
                                    >
                                        {item.status === 'EXECUTED' ? <CheckSquare size={20} strokeWidth={2.5} /> : <Square size={20} />}
                                    </button>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <button
                                        onClick={() => updatePrecision(item.id, 'status', 'NOT_EXECUTED')}
                                        className={`p-2 rounded-lg transition-all ${item.status === 'NOT_EXECUTED' ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 shadow-sm' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500'}`}
                                    >
                                        {item.status === 'NOT_EXECUTED' ? <XSquare size={20} strokeWidth={2.5} /> : <Square size={20} />}
                                    </button>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <button
                                        onClick={() => updatePrecision(item.id, 'status', 'NOT_APPLICABLE')}
                                        className={`p-2 rounded-lg transition-all ${item.status === 'NOT_APPLICABLE' ? 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500'}`}
                                    >
                                        {item.status === 'NOT_APPLICABLE' ? <CheckSquare size={20} strokeWidth={2.5} /> : <Square size={20} />}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="relative group/input">
                                        <input
                                            id={`${idPrefix}-checklist-comment-${item.id}`}
                                            name={`checklist_comment_${item.id}`}
                                            type="text"
                                            className="w-full border-b border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none bg-transparent text-sm py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors font-medium"
                                            placeholder={t('wizard.step6.addComment')}
                                            aria-label={`${t('wizard.step6.comment')} - ${item.activity || item.question_snapshot || ''}`}
                                            value={item.comment || ''}
                                            onChange={(e) => updatePrecision(item.id, 'comment', e.target.value)}
                                        />
                                        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-focus-within/input:w-full"></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
