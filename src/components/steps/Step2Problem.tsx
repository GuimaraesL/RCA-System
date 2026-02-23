/**
 * Proposta: Passo 2 do Wizard - Descrição do Problema (5W2H).
 * Fluxo: Captura o contexto detalhado do evento, focando no que ocorreu, quem identificou, onde e quais os impactos imediatos de qualidade e segurança.
 */

import React, { useId, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { RcaRecord, TaxonomyConfig } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';
import { useAi } from '../../context/AIContext';

interface Step2Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    taxonomy: TaxonomyConfig;
    errors?: Record<string, boolean>;
    isFieldRequired: (field: string) => boolean;
}

export const Step2Problem: React.FC<Step2Props> = ({ data, onChange, taxonomy, errors, isFieldRequired }) => {
    const { t } = useLanguage();
    const idPrefix = useId();
    const { analyzeRca, status } = useAi();

    // IA Ghost: Monitora o preenchimento para sugerir recorrências e insights
    useEffect(() => {
        const timer = setTimeout(() => {
            if (data.problem_description && data.problem_description.length > 50 && status === 'idle') {
                analyzeRca(data);
            }
        }, 5000); // 5 segundos de debounce

        return () => clearTimeout(timer);
    }, [data.problem_description, analyzeRca, status]);

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">{t('wizard.step2.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('wizard.step2.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <Input
                        id={`${idPrefix}-who`}
                        name="who"
                        label={t('wizard.step2.who')}
                        required={isFieldRequired('who')}
                        placeholder={t('wizard.step2.whoPlaceholder')}
                        value={data.who}
                        onChange={(e) => onChange('who', e.target.value)}
                        error={errors?.who}
                        data-testid="input-who"
                    />

                    <Input
                        id={`${idPrefix}-when`}
                        name="when"
                        label={t('wizard.step2.when')}
                        required={isFieldRequired('when')}
                        placeholder={t('wizard.step2.whenPlaceholder')}
                        value={data.when}
                        onChange={(e) => onChange('when', e.target.value)}
                        error={errors?.when}
                        data-testid="input-when"
                    />

                    <div className="md:col-span-2">
                        <Input
                            id={`${idPrefix}-where_description`}
                            name="where_description"
                            label={t('wizard.step2.where')}
                            required={isFieldRequired('where_description')}
                            placeholder={t('wizard.step2.wherePlaceholder')}
                            value={data.where_description}
                            onChange={(e) => onChange('where_description', e.target.value)}
                            error={errors?.where_description}
                            data-testid="input-where"
                        />
                    </div>
                </div>

                <div className="space-y-8 pt-8 border-t border-slate-50 dark:border-slate-800">
                    <Input
                        id={`${idPrefix}-what`}
                        name="what"
                        label={t('wizard.step2.what')}
                        required={isFieldRequired('what')}
                        placeholder={t('wizard.step2.whatPlaceholder')}
                        value={data.what || ''}
                        onChange={(e) => onChange('what', e.target.value)}
                        error={errors?.what}
                        data-testid="input-what"
                    />

                    <Input
                        id={`${idPrefix}-potential_impacts`}
                        name="potential_impacts"
                        label={t('wizard.step2.potentialImpacts') || "Impactos Potenciais"}
                        required={isFieldRequired('potential_impacts')}
                        placeholder={t('wizard.step2.potentialImpactsPlaceholder') || "Descreva os impactos..."}
                        value={data.potential_impacts || ''}
                        onChange={(e) => onChange('potential_impacts', e.target.value)}
                        error={errors?.potential_impacts}
                        data-testid="input-impacts"
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Textarea
                            id={`${idPrefix}-problem_description`}
                            label={t('wizard.step2.problemDescription')}
                            required={isFieldRequired('problem_description')}
                            placeholder={t('wizard.step2.problemDescriptionPlaceholder')}
                            rows={6}
                            value={data.problem_description || ''}
                            onChange={(e) => onChange('problem_description', e.target.value)}
                            error={errors?.problem_description}
                            data-testid="input-problem-description"
                        />

                        <Textarea
                            id={`${idPrefix}-quality_impacts`}
                            label={t('wizard.step2.qualityImpacts')}
                            required={isFieldRequired('quality_impacts')}
                            placeholder={t('wizard.step2.qualityImpactsPlaceholder')}
                            rows={6}
                            value={data.quality_impacts || ''}
                            onChange={(e) => onChange('quality_impacts', e.target.value)}
                            error={errors?.quality_impacts}
                            data-testid="input-quality-impacts"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
