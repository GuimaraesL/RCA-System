
import React from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { RcaRecord, TaxonomyConfig } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step2Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    taxonomy: TaxonomyConfig; // Added
    errors?: Record<string, boolean>;
    isFieldRequired: (field: string) => boolean;
}

export const Step2Problem: React.FC<Step2Props> = ({ data, onChange, taxonomy, errors, isFieldRequired }) => {
    const { t } = useLanguage();

    // Helper for mandatory fields removed - using prop instead

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('wizard.step2.title')}</h2>
                <p className="text-gray-600 mb-6">{t('wizard.step2.subtitle')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Input
                        id="who"
                        name="who"
                        label={t('wizard.step2.who')}
                        required={isFieldRequired('who')}
                        placeholder={t('wizard.step2.whoPlaceholder')}
                        value={data.who}
                        onChange={(e) => onChange('who', e.target.value)}
                        error={errors?.who}
                    />

                    <Input
                        id="when"
                        name="when"
                        label={t('wizard.step2.when')}
                        required={isFieldRequired('when')}
                        placeholder={t('wizard.step2.whenPlaceholder')}
                        value={data.when}
                        onChange={(e) => onChange('when', e.target.value)}
                        error={errors?.when}
                    />

                    <div className="md:col-span-2">
                        <Input
                            id="where_description"
                            name="where_description"
                            label={t('wizard.step2.where')}
                            required={isFieldRequired('where_description')}
                            placeholder={t('wizard.step2.wherePlaceholder')}
                            value={data.where_description}
                            onChange={(e) => onChange('where_description', e.target.value)}
                            error={errors?.where_description}
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <Input
                        id="what"
                        name="what"
                        label={t('wizard.step2.what')}
                        required={isFieldRequired('what')}
                        placeholder={t('wizard.step2.whatPlaceholder')}
                        value={data.what}
                        onChange={(e) => onChange('what', e.target.value)}
                        error={errors?.what}
                    />

                    <Input
                        id="potential_impacts"
                        name="potential_impacts"
                        label={t('wizard.step2.potentialImpacts') || "Impactos Potenciais"}
                        required={isFieldRequired('potential_impacts')}
                        placeholder={t('wizard.step2.potentialImpactsPlaceholder') || "Descreva os impactos..."}
                        value={data.potential_impacts}
                        onChange={(e) => onChange('potential_impacts', e.target.value)}
                        error={errors?.potential_impacts}
                    />

                    <Textarea
                        id="problem_description"
                        label={t('wizard.step2.problemDescription')}
                        required={isFieldRequired('problem_description')}
                        placeholder={t('wizard.step2.problemDescriptionPlaceholder')}
                        rows={4}
                        value={data.problem_description || ''}
                        onChange={(e) => onChange('problem_description', e.target.value)}
                        error={errors?.problem_description}
                    />

                    <Textarea
                        id="quality_impacts"
                        label={t('wizard.step2.qualityImpacts')}
                        required={isFieldRequired('quality_impacts')}
                        placeholder={t('wizard.step2.qualityImpactsPlaceholder')}
                        rows={4}
                        value={data.quality_impacts || ''}
                        onChange={(e) => onChange('quality_impacts', e.target.value)}
                        error={errors?.quality_impacts}
                    />
                </div>
            </div>
        </div>
    );
};
