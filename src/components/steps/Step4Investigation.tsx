/**
 * Proposta: Passo 4 do Wizard - Ferramentas de Investigação (5 Porquês e Ishikawa).
 * Fluxo: Gerencia a análise técnica através do Diagrama de Espinha de Peixe, orquestra o editor de 5 Porquês (Linear/Avançado) e consolida a definição das Causas Raiz vinculadas aos fatores 6M.
 */

import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Plus, Trash2, Wand2, Loader2, AlertTriangle, UserCheck, GitBranch } from 'lucide-react';
import { RcaRecord, TaxonomyConfig, IshikawaDiagram } from '../../types';
import { generateId } from '../../services/utils';
import { translate6M } from '../../utils/statusUtils';
import { FiveWhysEditor } from './fivewhys/FiveWhysEditor';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step4Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    onAnalyzeAI: () => void;
    isAnalyzing: boolean;
    taxonomy: TaxonomyConfig;
    showHra?: boolean;
    isFieldRequired: (field: string) => boolean;
    errors?: Record<string, boolean>;
}

const Step4InvestigationComponent: React.FC<Step4Props> = ({ data, onChange, onAnalyzeAI, isAnalyzing, taxonomy, showHra, isFieldRequired, errors }) => {
    const { t } = useLanguage();
    const [newIshikawaItem, setNewIshikawaItem] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<keyof IshikawaDiagram>('method');

    const ishikawaCategories = [
        { key: 'method', label: t('wizard.step4.ishikawaCategories.method'), color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { key: 'machine', label: t('wizard.step4.ishikawaCategories.machine'), color: 'bg-green-100 text-green-800 border-green-200' },
        { key: 'manpower', label: t('wizard.step4.ishikawaCategories.manpower'), color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        { key: 'material', label: t('wizard.step4.ishikawaCategories.material'), color: 'bg-red-100 text-red-800 border-red-200' },
        { key: 'measurement', label: t('wizard.step4.ishikawaCategories.measurement'), color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
        { key: 'environment', label: t('wizard.step4.ishikawaCategories.environment'), color: 'bg-orange-100 text-orange-800 border-orange-200' }
    ];

    const addIshikawaItem = () => {
        if (newIshikawaItem.trim()) {
            const currentItems = data.ishikawa?.[selectedCategory] || [];
            onChange(`ishikawa.${selectedCategory}`, [...currentItems, newIshikawaItem.trim()]);
            setNewIshikawaItem('');
        }
    };

    const removeIshikawaItem = (category: keyof IshikawaDiagram, index: number) => {
        const currentItems = data.ishikawa?.[category] || [];
        onChange(`ishikawa.${category}`, currentItems.filter((_, i) => i !== index));
    };

    const addRootCause = () => {
        onChange('root_causes', [...(data.root_causes || []), { id: generateId('RC'), root_cause_m_id: '', cause: '' }]);
    };

    const removeRootCause = (idx: number) => {
        const newList = [...(data.root_causes || [])];
        newList.splice(idx, 1);
        onChange('root_causes', newList);
    };

    const updateRootCause = (idx: number, field: 'root_cause_m_id' | 'cause', value: string) => {
        const newList = [...(data.root_causes || [])];
        newList[idx] = { ...newList[idx], [field]: value };
        onChange('root_causes', newList);
    };

    // --- Lógica de Validação para Causa Raiz ---
    const countWhysInNode = (node: any): number => {
        let count = (node.whys || []).filter((w: any) => w.answer?.trim()).length;
        if (node.children) {
            node.children.forEach((child: any) => {
                count += countWhysInNode(child);
            });
        }
        return count;
    };

    const linearWhysCount = (data.five_whys || []).filter(w => w && w.answer?.trim()).length;
    const advancedWhysCount = (data.five_whys_chains || []).reduce((acc, chain) => acc + countWhysInNode(chain.root_node), 0);

    const totalFilledWhys = linearWhysCount + advancedWhysCount;
    const canDefineRootCause = totalFilledWhys >= 3;

    // --- Lógica de Alternância do Modo dos 5 Porquês ---
    const hasChains = data.five_whys_chains && data.five_whys_chains?.length > 0;
    const [useAdvancedMode, setUseAdvancedMode] = useState(!!hasChains);

    const addLegacyWhy = () => {
        const nextId = ((data.five_whys?.length || 0) + 1).toString();
        const newWhy = { id: nextId, why_question: '', answer: '' };
        onChange('five_whys', [...(data.five_whys || []), newWhy]);
    };

    const removeLegacyWhy = (index: number) => {
        const newWhys = [...(data.five_whys || [])];
        newWhys.splice(index, 1);
        onChange('five_whys', newWhys);
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('wizard.step4.title')}</h2>
                <p className="text-gray-600 dark:text-slate-400">{t('wizard.step4.subtitle')}</p>
            </div>

            {/* Bloco dos 5 Porquês */}
            <div
                data-testid="section-five-whys"
                className={`p-6 rounded-xl border shadow-sm transition-all ${errors?.five_whys ? 'border-red-500 ring-2 ring-red-50 dark:ring-red-900/20' : ''} ${useAdvancedMode ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800'}`}
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {t('wizard.step4.fiveWhysTitle')} {isFieldRequired('five_whys') && <span className="text-red-500">*</span>}
                            {useAdvancedMode && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">{t('wizard.step4.advancedMode')}</span>}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                            {useAdvancedMode
                                ? t('wizard.step4.advancedModeDesc')
                                : t('wizard.step4.linearModeDesc')}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {!useAdvancedMode && (
                            <Button variant="ghost" onClick={() => setUseAdvancedMode(true)} className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                                <GitBranch size={16} className="mr-2" /> {t('wizard.step4.switchToAdvanced')}
                            </Button>
                        )}
                        {useAdvancedMode && !hasChains && (
                            <Button variant="ghost" onClick={() => setUseAdvancedMode(false)} className="text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
                                {t('wizard.step4.switchToLinear')}
                            </Button>
                        )}
                    </div>
                </div>

                {useAdvancedMode ? (
                    <FiveWhysEditor
                        chains={data.five_whys_chains || []}
                        onChange={newChains => onChange('five_whys_chains', newChains)}
                    />
                ) : (
                    <div className="space-y-4">
                        {(data.five_whys || []).length === 0 && (
                            <div className="text-center p-8 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                                <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">{t('wizard.step4.addWhy')}</p>
                                <Button
                                    onClick={addLegacyWhy}
                                    variant="primary"
                                    data-testid="btn-add-why"
                                >
                                    <Plus size={16} className="mr-2" /> {t('wizard.add')}
                                </Button>
                            </div>
                        )}

                        {(data.five_whys || []).map((w, index) => (
                            <div key={index} className="flex items-start gap-3 group">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mt-2 shadow-sm">
                                    {index + 1}
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 uppercase">{t('wizard.step4.fiveWhys.whyEffect')}</label>
                                        <Input
                                            id={`five_whys_${index}_question`}
                                            data-testid={`input-five-why-question-${index}`}
                                            value={w.why_question}
                                            onChange={(e) => {
                                                const newWhys = [...(data.five_whys || [])];
                                                newWhys[index] = { ...w, why_question: e.target.value };
                                                onChange('five_whys', newWhys);
                                            }}
                                            placeholder="..."
                                            error={errors?.five_whys && !w.why_question.trim()}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 uppercase">{t('wizard.step4.fiveWhys.whyCause')}</label>
                                        <Input
                                            id={`five_whys_${index}_answer`}
                                            data-testid={`input-five-why-answer-${index}`}
                                            value={w.answer}
                                            onChange={(e) => {
                                                const newWhys = [...(data.five_whys || [])];
                                                newWhys[index] = { ...w, answer: e.target.value };
                                                onChange('five_whys', newWhys);
                                            }}
                                            placeholder="..."
                                            error={errors?.five_whys && !w.answer.trim()}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeLegacyWhy(index)}
                                    className="mt-8 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {(data.five_whys || []).length > 0 && (
                            <div className="flex justify-between items-center mt-4">
                                <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-blue-300 dark:border-blue-700">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                        {linearWhysCount}/5
                                    </p>
                                </div>
                                <Button
                                    onClick={addLegacyWhy}
                                    variant="secondary"
                                    size="sm"
                                    className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                    data-testid="btn-add-why-footer"
                                >
                                    <Plus size={16} className="mr-1" /> {t('wizard.step4.addWhy')}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Diagrama de Ishikawa (Espinha de Peixe) */}
            <div
                data-testid="section-ishikawa"
                className={`bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6 rounded-xl border shadow-sm ${errors?.ishikawa ? 'border-red-500 ring-2 ring-red-50 dark:ring-red-900/20' : 'border-green-200 dark:border-green-800'}`}
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('wizard.step4.ishikawaTitle')} {isFieldRequired('ishikawa') && <span className="text-red-500">*</span>}</h3>
                </div>

                <div className="mb-8 bg-white dark:bg-slate-900 p-4 rounded-lg border border-green-200 dark:border-green-800 shadow-sm flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <Select
                            id="ishikawa_category"
                            label={t('wizard.step4.ishikawaSubtitle')}
                            options={ishikawaCategories.map(c => ({ value: c.key, label: c.label }))}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as any)}
                        />
                    </div>
                    <div className="flex-[2] w-full">
                        <Input
                            id="ishikawa_new_item"
                            data-testid="input-ishikawa-new-item"
                            label={t('wizard.step4.addItem')}
                            placeholder="..."
                            value={newIshikawaItem}
                            onChange={(e) => setNewIshikawaItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addIshikawaItem()}
                        />
                    </div>
                    <Button
                        onClick={addIshikawaItem}
                        className="gap-2 w-full md:w-auto"
                        variant="primary"
                        data-testid="btn-add-ishikawa-item"
                    >
                        <Plus className="w-4 h-4" />
                        {t('wizard.add')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ishikawaCategories.map((category) => (
                        <div key={category.key} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                            <h4 className={`font-semibold mb-3 px-3 py-1 rounded-full inline-block text-xs uppercase tracking-wider border ${category.color}`}>
                                {category.label}
                            </h4>
                            <ul className="space-y-2">
                                {(data.ishikawa?.[category.key as keyof IshikawaDiagram] || []).map((item, index) => (
                                    <li key={index} className="flex items-center justify-between gap-3 text-sm bg-white dark:bg-slate-700 p-3 rounded-md border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group animate-in zoom-in-95 duration-200">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>
                                        <span className="text-slate-700 dark:text-slate-200 break-words flex-1 leading-relaxed font-medium">{item}</span>
                                        <button
                                            onClick={() => removeIshikawaItem(category.key as any, index)}
                                            className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                                {(data.ishikawa?.[category.key as keyof IshikawaDiagram] || []).length === 0 && (
                                    <li className="text-gray-300 text-xs italic py-2 text-center border border-dashed border-gray-200 rounded">
                                        -
                                    </li>
                                )}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Definição de Causas Raiz */}
            <div
                data-testid="section-root-causes"
                className={`p-6 rounded-xl border-2 shadow-sm transition-all ${errors?.root_causes ? 'border-red-500 ring-2 ring-red-50 dark:ring-red-900/20' : 'border-yellow-300 dark:border-yellow-700'} ${canDefineRootCause ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20' : 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700'}`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('wizard.step4.rootCausesTitle')} {isFieldRequired('root_causes') && <span className="text-red-500">*</span>}</h3>
                    {canDefineRootCause && (
                        <button
                            onClick={addRootCause}
                            className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border border-yellow-300 dark:border-yellow-700 text-sm"
                            data-testid="btn-add-root-cause"
                        >
                            <Plus size={16} /> {t('wizard.step4.addRootCause')}
                        </button>
                    )}
                </div>

                {!canDefineRootCause && (
                    <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-lg flex items-center gap-3">
                        <AlertTriangle className="text-yellow-600 dark:text-yellow-500" size={20} />
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            {t('wizard.step4.rootCausesSubtitle')}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {(data.root_causes || []).length === 0 && canDefineRootCause && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 italic text-center p-4 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-dashed border-yellow-200 dark:border-yellow-800">
                            {t('wizard.step4.addRootCause')}
                        </p>
                    )}

                    {(data.root_causes || []).map((rc, idx) => (
                        <div key={rc.id} className={`grid grid-cols-12 gap-4 items-start bg-white dark:bg-slate-800 p-4 rounded-lg border shadow-sm group ${(!rc.root_cause_m_id || !rc.cause.trim()) && errors?.root_causes ? 'border-red-300 ring-1 ring-red-50 dark:ring-red-900/20' : 'border-yellow-200 dark:border-yellow-800'}`}>
                            <div className="col-span-12 md:col-span-4">
                                <Select
                                    id={`root_cause_${idx}_m_id`}
                                    label={t('wizard.step4.sixMFactor')}
                                    options={[{ value: '', label: t('wizard.select') }, ...(taxonomy?.rootCauseMs || []).map(m => ({ value: m.id, label: translate6M(m.id, m.name, t) }))]}
                                    value={rc.root_cause_m_id}
                                    onChange={e => updateRootCause(idx, 'root_cause_m_id', e.target.value)}
                                    error={!rc.root_cause_m_id && errors?.root_causes}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-7">
                                <Textarea
                                    id={`root_cause_${idx}_cause`}
                                    label={t('wizard.step4.causeDescription')}
                                    rows={2}
                                    value={rc.cause}
                                    onChange={e => updateRootCause(idx, 'cause', e.target.value)}
                                    placeholder="..."
                                    error={!rc.cause.trim() && errors?.root_causes}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-1 flex justify-center pt-8">
                                <button onClick={() => removeRootCause(idx)} className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {showHra && (
                    <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 text-sm rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-start gap-3 animate-in fade-in">
                        <UserCheck size={20} className="mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-bold block mb-1">{t('wizard.stepHRA.hraAvailableTitle')}</span>
                            <span>{t('wizard.stepHRA.hraAvailableMessage')}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const Step4Investigation = React.memo(Step4InvestigationComponent);
