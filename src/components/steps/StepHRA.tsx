/**
 * Proposta: Passo opcional do Wizard - Análise de Confiabilidade Humana (HRA).
 * Fluxo: Renderiza um questionário técnico focado em fatores humanos, permitindo a identificação de falhas sistêmicas de treinamento, procedimentos ou rotina, consolidando com uma validação final do coordenador.
 */

import React, { useId } from 'react';
import { RcaRecord } from '../../types';
import { UserCheck, CheckSquare, Square, XSquare, Info, ShieldCheck } from 'lucide-react';
import { Textarea } from '../ui/Textarea';
import { useSorting } from '../../hooks/useSorting';
import { SortHeader } from '../ui/SortHeader';
import { useLanguage } from '../../context/LanguageDefinition';

interface StepHRAProps {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const StepHRA: React.FC<StepHRAProps> = ({ data, onChange }) => {
    const { t } = useLanguage();
    const idPrefix = useId();

    const updateHraQuestion = (id: string, field: 'answer' | 'comment', value: any) => {
        if (!data.human_reliability) return;
        const newQuestions = data.human_reliability.questions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        );
        onChange('human_reliability', { ...data.human_reliability, questions: newQuestions });
    };

    const updateHraConclusion = (id: string, field: 'selected' | 'description', value: any) => {
        if (!data.human_reliability) return;
        const newConclusions = data.human_reliability.conclusions.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        );
        onChange('human_reliability', { ...data.human_reliability, conclusions: newConclusions });
    };

    // Lógica de ordenação das questões do questionário
    const { sortedItems: questions, sortConfig, handleSort } = useSorting<any>(data.human_reliability?.questions || [], { key: 'question', direction: 'asc' });

    if (!data.human_reliability) return null;

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Cabeçalho de Contexto HRA */}
            <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-xl flex gap-4 text-blue-800 text-sm shadow-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                    <UserCheck size={24} />
                </div>
                <div>
                    <strong className="text-blue-900 font-bold block mb-1 text-base">{t('wizard.stepHRA.title')}</strong>
                    <p className="font-medium opacity-80">{t('wizard.stepHRA.subtitle')}</p>
                </div>
            </div>

            {/* Questionário Detalhado */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-white">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                        {t('wizard.stepHRA.questionnaire')}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                <SortHeader label={t('wizard.stepHRA.question')} sortKey="question" currentSort={sortConfig} onSort={handleSort} className="px-6 py-4 font-black text-[10px] uppercase tracking-widest" />
                                <th className="px-4 py-4 w-24 text-center font-black text-[10px] uppercase tracking-widest">{t('wizard.stepHRA.yes')}</th>
                                <th className="px-4 py-4 w-24 text-center font-black text-[10px] uppercase tracking-widest">{t('wizard.stepHRA.no')}</th>
                                <SortHeader label={t('wizard.stepHRA.comments')} sortKey="comment" currentSort={sortConfig} onSort={handleSort} className="w-1/3 px-6 py-4 font-black text-[10px] uppercase tracking-widest" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {questions.map(q => (
                                <tr key={q.id} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-6 py-5">
                                        <div className="text-[10px] text-blue-600 mb-1.5 font-black uppercase tracking-widest opacity-70">{t(q.category || '')}</div>
                                        <div className="text-slate-700 font-bold leading-relaxed">{t(q.question || '')}</div>
                                    </td>
                                    <td className="px-4 py-5 text-center">
                                        <button 
                                            onClick={() => updateHraQuestion(q.id, 'answer', 'YES')} 
                                            className={`p-2 rounded-lg transition-all ${q.answer === 'YES' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 shadow-sm' : 'text-slate-300 hover:text-slate-400'}`}
                                        >
                                            {q.answer === 'YES' ? <CheckSquare size={20} strokeWidth={2.5} /> : <Square size={20} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-5 text-center">
                                        <button 
                                            onClick={() => updateHraQuestion(q.id, 'answer', 'NO')} 
                                            className={`p-2 rounded-lg transition-all ${q.answer === 'NO' ? 'text-rose-600 bg-rose-50 border border-rose-100 shadow-sm' : 'text-slate-300 hover:text-slate-400'}`}
                                        >
                                            {q.answer === 'NO' ? <XSquare size={20} strokeWidth={2.5} /> : <Square size={20} />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="relative group/input">
                                            <input
                                                id={`${idPrefix}-hra-comment-${q.id}`}
                                                name={`hra_comment_${q.id}`}
                                                type="text"
                                                className="w-full border-b border-slate-200 focus:border-blue-500 outline-none bg-transparent text-sm py-1.5 text-slate-900 placeholder:text-slate-300 transition-colors font-medium"
                                                placeholder={t('wizard.stepHRA.addComment')}
                                                aria-label={`${t('wizard.stepHRA.comments')} - ${t(q.question_snapshot || '') || t(q.question || '')}`}
                                                value={q.comment}
                                                onChange={e => updateHraQuestion(q.id, 'comment', e.target.value)}
                                            />
                                            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-focus-within/input:w-full"></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Conclusão da Análise de Fatores Humanos */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/60">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                    {t('wizard.stepHRA.conclusion')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(data.human_reliability.conclusions || []).map(c => (
                        <div key={c.id} className={`p-6 rounded-xl border transition-all duration-300 ${c.selected ? 'border-blue-300 bg-blue-50/30 shadow-sm' : 'border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50'}`}>
                            <div className="flex items-start gap-4 mb-4">
                                <button
                                    id={`${idPrefix}-btn-hra-concl-${c.id}`}
                                    onClick={() => updateHraConclusion(c.id, 'selected', !c.selected)}
                                    className={`mt-0.5 transition-colors ${c.selected ? 'text-blue-600' : 'text-slate-300'}`}
                                    aria-pressed={c.selected}
                                    aria-labelledby={`${idPrefix}-label-hra-concl-${c.id}`}
                                >
                                    {c.selected ? <CheckSquare size={24} strokeWidth={2.5} /> : <Square size={24} />}
                                </button>
                                <label id={`${idPrefix}-label-hra-concl-${c.id}`} htmlFor={`${idPrefix}-btn-hra-concl-${c.id}`} className={`font-bold text-sm cursor-pointer leading-tight ${c.selected ? 'text-blue-900' : 'text-slate-600'}`}>
                                    {t(c.label || '')}
                                </label>
                            </div>
                            {c.selected && (
                                <div className="pl-10 animate-in fade-in slide-in-from-top-2">
                                    <Textarea
                                        id={`${idPrefix}-hra-concl-desc-${c.id}`}
                                        name={`hra_conclusion_description_${c.id}`}
                                        placeholder={t('wizard.stepHRA.describeBriefly')}
                                        rows={3}
                                        value={c.description}
                                        onChange={e => updateHraConclusion(c.id, 'description', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Validação Institucional */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/60 group hover:border-blue-200 transition-all">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                    {t('wizard.stepHRA.validation')}
                </h3>
                <div className="flex flex-col lg:flex-row items-start gap-10">
                    <div className="flex-1 w-full">
                        <span id={`${idPrefix}-hra-val-label`} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('wizard.stepHRA.validationQuestion')}</span>
                        <div id={`${idPrefix}-hra-val-selector`} className="flex gap-4" role="radiogroup" aria-labelledby={`${idPrefix}-hra-val-label`}>
                            <button
                                aria-checked={data.human_reliability!.validation?.isValidated === 'YES'}
                                role="radio"
                                onClick={() => onChange('human_reliability', { ...data.human_reliability!, validation: { ... (data.human_reliability!.validation || { isValidated: '', comment: '' }), isValidated: 'YES' } })}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 text-sm font-black transition-all ${data.human_reliability!.validation?.isValidated === 'YES' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm shadow-emerald-500/10' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                <CheckSquare size={18} strokeWidth={3} /> {t('wizard.stepHRA.yes').toUpperCase()}
                            </button>
                            <button
                                aria-checked={data.human_reliability!.validation?.isValidated === 'NO'}
                                role="radio"
                                onClick={() => onChange('human_reliability', { ...data.human_reliability!, validation: { ... (data.human_reliability!.validation || { isValidated: '', comment: '' }), isValidated: 'NO' } })}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 text-sm font-black transition-all ${data.human_reliability!.validation?.isValidated === 'NO' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm shadow-rose-500/10' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                <XSquare size={18} strokeWidth={3} /> {t('wizard.stepHRA.no').toUpperCase()}
                            </button>
                        </div>
                    </div>
                    <div className="flex-[2] w-full">
                        <label htmlFor={`${idPrefix}-hra-coord-comment`} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('wizard.stepHRA.coordinatorComments')}</label>
                        <Textarea
                            id={`${idPrefix}-hra-coord-comment`}
                            name="hra_coordinator_comment"
                            rows={4}
                            value={data.human_reliability!.validation?.comment || ''}
                            onChange={e => onChange('human_reliability', { ...data.human_reliability!, validation: { ... (data.human_reliability!.validation || { isValidated: '', comment: '' }), comment: e.target.value } })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
