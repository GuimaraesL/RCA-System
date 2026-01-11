
import React from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { RcaRecord } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step2Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    errors?: Record<string, boolean>;
}

export const Step2Problem: React.FC<Step2Props> = ({ data, onChange, errors }) => {
    const { t } = useLanguage();

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('wizard.step2.title')}</h2>
                <p className="text-gray-600 mb-6">{t('wizard.step2.subtitle')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Input
                        label={t('wizard.step2.who')}
                        required
                        placeholder={t('wizard.step2.whoPlaceholder')}
                        value={data.who}
                        onChange={(e) => onChange('who', e.target.value)}
                        error={errors?.who}
                    />

                    <Input
                        label={t('wizard.step2.when')}
                        required
                        placeholder={t('wizard.step2.whenPlaceholder')}
                        value={data.when}
                        onChange={(e) => onChange('when', e.target.value)}
                        error={errors?.when}
                    />

                    <Input
                        label={t('wizard.step2.where')}
                        required
                        placeholder={t('wizard.step2.wherePlaceholder')}
                        value={data.where_description}
                        onChange={(e) => onChange('where_description', e.target.value)}
                        error={errors?.where_description}
                    />

                    <Input
                        label={t('wizard.step2.what')}
                        required
                        placeholder={t('wizard.step2.whatPlaceholder')}
                        value={data.what}
                        onChange={(e) => onChange('what', e.target.value)}
                        error={errors?.what}
                    />
                </div>

                <div className="space-y-6">
                    <Textarea
                        label={t('wizard.step2.problemDescription')}
                        required
                        placeholder={t('wizard.step2.problemDescriptionPlaceholder')}
                        rows={6}
                        value={data.problem_description}
                        onChange={(e) => onChange('problem_description', e.target.value)}
                        error={errors?.problem_description}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Textarea
                            label={t('wizard.step2.potentialImpacts')}
                            placeholder={t('wizard.step2.potentialImpactsPlaceholder')}
                            rows={4}
                            value={data.potential_impacts}
                            onChange={(e) => onChange('potential_impacts', e.target.value)}
                        />
                        <Textarea
                            label={t('wizard.step2.qualityImpacts')}
                            placeholder={t('wizard.step2.qualityImpactsPlaceholder')}
                            rows={4}
                            value={data.quality_impacts || ''}
                            onChange={(e) => onChange('quality_impacts', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
