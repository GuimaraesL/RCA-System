/**
 * Proposta: Passo 7 do Wizard - Informações Adicionais e Lições Aprendidas.
 * Fluxo: Captura notas de reunião, comentários gerais, histórico do ativo e consolida as lições aprendidas para prevenção de reincidências.
 */

import React, { useState, useId } from 'react';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { RcaRecord } from '../../types';
import { Plus, Trash2, Info, Link as LinkIcon, MessageSquare, History } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step7Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    isFieldRequired?: (field: string) => boolean;
    errors?: Record<string, boolean>;
}

export const Step7Additional: React.FC<Step7Props> = ({ data, onChange, isFieldRequired, errors }) => {
    const { t } = useLanguage();
    const idPrefix = useId();
    const [newLink, setNewLink] = useState({ title: '', url: '' });

    // Garante a existência do objeto additionalInfo para compatibilidade com registros legados
    const info = data.additionalInfo || { meetingNotes: '', comments: '', historicalInfo: '' };

    const updateInfo = (field: keyof typeof info, value: string) => {
        onChange('additionalInfo', { ...info, [field]: value });
    };

    const addLesson = () => {
        onChange('lessons_learned', [...data.lessons_learned, '']);
    };

    const updateLesson = (idx: number, val: string) => {
        const list = [...data.lessons_learned];
        list[idx] = val;
        onChange('lessons_learned', list);
    };

    const removeLesson = (idx: number) => {
        const list = [...data.lessons_learned];
        list.splice(idx, 1);
        onChange('lessons_learned', list);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">{t('wizard.step7.title')}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('wizard.step7.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><MessageSquare size={20} /></div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px]">{t('wizard.step7.meetingNotes')}</h3>
                    </div>
                    <Textarea
                        id={`${idPrefix}-meeting-notes`}
                        placeholder={t('wizard.step7.meetingNotesPlaceholder')}
                        rows={10}
                        value={info.meetingNotes}
                        onChange={(e) => updateInfo('meetingNotes', e.target.value)}
                    />
                </div>

                <div className="space-y-10">
                    {/* Seção de Links Relacionados (Evidências Externas) */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><LinkIcon size={20} /></div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px]">{t('wizard.step7.links')}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <Input
                                id={`${idPrefix}-link-title`}
                                name="link_title"
                                label={t('wizard.step7.linkTitle')}
                                placeholder={t('wizard.step7.linkTitlePlaceholder')}
                                value={newLink.title}
                                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                            />
                            <Input
                                id={`${idPrefix}-link-url`}
                                name="link_url"
                                label={t('wizard.step7.linkUrl')}
                                placeholder="https://..."
                                value={newLink.url}
                                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Info size={20} /></div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px]">{t('wizard.step7.generalComments')}</h3>
                        </div>
                        <Textarea
                            id={`${idPrefix}-general-comments`}
                            placeholder={t('wizard.step7.generalCommentsPlaceholder')}
                            rows={6}
                            value={info.comments}
                            onChange={(e) => updateInfo('comments', e.target.value)}
                        />
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><History size={20} /></div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px]">{t('wizard.step7.historicalInfo')}</h3>
                    </div>
                    <Textarea
                        id={`${idPrefix}-historical-info`}
                        placeholder={t('wizard.step7.historicalInfoPlaceholder')}
                        rows={6}
                        value={info.historicalInfo}
                        onChange={(e) => updateInfo('historicalInfo', e.target.value)}
                    />
                </div>
            </div>

            {/* Gestão de Lições Aprendidas */}
            <div className={`bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border transition-all ${errors?.lessons_learned ? 'border-rose-300 dark:border-rose-700 ring-4 ring-rose-50 dark:ring-rose-900/20' : 'border-slate-200/60 dark:border-slate-800'}`}>
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                        {t('wizard.step7.lessonsLearned')} {isFieldRequired && isFieldRequired('lessons_learned') && <span className="text-rose-500">*</span>}
                    </h3>
                    <button onClick={addLesson} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
                        <Plus size={16} /> {t('wizard.add')}
                    </button>
                </div>
                <div className="space-y-4">
                    {data.lessons_learned.map((lesson, idx) => (
                        <div key={idx} className="flex gap-4 items-center group animate-in slide-in-from-left-2 duration-300">
                            <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg flex items-center justify-center font-bold text-xs">
                                {idx + 1}
                            </div>
                            <input
                                id={`${idPrefix}-lesson-${idx}`}
                                name={`lesson_${idx}`}
                                type="text"
                                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                                value={lesson}
                                onChange={e => updateLesson(idx, e.target.value)}
                            />
                            <button onClick={() => removeLesson(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {data.lessons_learned.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/30">
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('wizard.step7.lessonsEmpty')}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-10 p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                    <Info size={24} />
                </div>
                <div>
                    <strong className="text-blue-900 dark:text-blue-100 font-bold block mb-1 uppercase tracking-tight text-xs">{t('wizard.step7.tip')}</strong>
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed font-medium opacity-80">{t('wizard.step7.tipText')}</p>
                </div>
            </div>
        </div>
    );
};
