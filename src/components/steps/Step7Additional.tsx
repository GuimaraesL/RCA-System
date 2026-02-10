/**
 * Proposta: Passo 7 do Wizard - Informações Adicionais e Lições Aprendidas.
 * Fluxo: Captura notas de reunião, comentários gerais, histórico do ativo e consolida as lições aprendidas para prevenção de reincidências.
 */

import React, { useState } from 'react';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { RcaRecord } from '../../types';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step7Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const Step7Additional: React.FC<Step7Props> = ({ data, onChange }) => {
    const { t } = useLanguage();
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
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('wizard.step7.title')}</h2>
                <p className="text-gray-600">{t('wizard.step7.subtitle')}</p>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <Textarea
                        id="meeting_notes"
                        label={t('wizard.step7.meetingNotes')}
                        placeholder={t('wizard.step7.meetingNotesPlaceholder')}
                        rows={6}
                        value={info.meetingNotes}
                        onChange={(e) => updateInfo('meetingNotes', e.target.value)}
                    />
                </div>

                {/* Seção de Links Relacionados (Evidências Externas) */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">{t('wizard.step7.links')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            id="link_title"
                            name="link_title"
                            label={t('wizard.step7.linkTitle')}
                            placeholder={t('wizard.step7.linkTitlePlaceholder')}
                            value={newLink.title}
                            onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                        />
                        <Input
                            id="link_url"
                            name="link_url"
                            label={t('wizard.step7.linkUrl')}
                            placeholder="https://..."
                            value={newLink.url}
                            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <Textarea
                        id="general_comments"
                        label={t('wizard.step7.generalComments')}
                        placeholder={t('wizard.step7.generalCommentsPlaceholder')}
                        rows={6}
                        value={info.comments}
                        onChange={(e) => updateInfo('comments', e.target.value)}
                    />
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <Textarea
                        id="historical_info"
                        label={t('wizard.step7.historicalInfo')}
                        placeholder={t('wizard.step7.historicalInfoPlaceholder')}
                        rows={8}
                        value={info.historicalInfo}
                        onChange={(e) => updateInfo('historicalInfo', e.target.value)}
                    />
                </div>
            </div>

            {/* Gestão de Lições Aprendidas */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('wizard.step7.lessonsLearned')}</h3>
                    <button onClick={addLesson} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:text-blue-700">
                        <Plus size={14} /> {t('wizard.add')}
                    </button>
                </div>
                <div className="space-y-3">
                    {data.lessons_learned.map((lesson, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                id={`lesson_${idx}`}
                                name={`lesson_${idx}`}
                                type="text"
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400"
                                value={lesson}
                                onChange={e => updateLesson(idx, e.target.value)}
                            />
                            <button onClick={() => removeLesson(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {data.lessons_learned.length === 0 && <p className="text-xs text-slate-400 italic">{t('wizard.step7.lessonsEmpty')}</p>}
                </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>{t('wizard.step7.tip')}</strong> {t('wizard.step7.tipText')}
                </p>
            </div>
        </div>
    );
};