
import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { RcaRecord, TaxonomyConfig } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step3Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    taxonomy: TaxonomyConfig;
    errors?: Record<string, boolean>;
}

export const Step3Technical: React.FC<Step3Props> = ({ data, onChange, taxonomy, errors }) => {
    const { t } = useLanguage();

    // Dependent Dropdown Logic (Specialty -> Failure Mode)
    const filteredFailureModes = taxonomy.failureModes.filter(fm => {
        if (!data.specialty_id) return true;
        if (!fm.specialty_ids || fm.specialty_ids.length === 0) return true;
        return fm.specialty_ids.includes(data.specialty_id);
    });

    // Auto-reset Failure Mode if it becomes invalid after Specialty change
    React.useEffect(() => {
        if (data.failure_mode_id && data.specialty_id) {
            const isValid = filteredFailureModes.some(fm => fm.id === data.failure_mode_id);
            if (!isValid) {
                console.log('🔄 Auto-resetting Failure Mode due to Specialty mismatch');
                onChange('failure_mode_id', '');
            }
        }
    }, [data.specialty_id, data.failure_mode_id, filteredFailureModes, onChange]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('wizard.step3.title')}</h2>
                <p className="text-gray-600 mb-6">{t('wizard.step3.subtitle')}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Select
                        label={t('wizard.step3.specialty')}
                        required
                        options={[{ value: '', label: t('wizard.select') }, ...taxonomy.specialties.map(s => ({ value: s.id, label: s.name }))]}
                        value={data.specialty_id}
                        onChange={(e) => onChange('specialty_id', e.target.value)}
                        error={errors?.specialty_id}
                    />

                    <Select
                        label={t('wizard.step3.failureMode')}
                        required
                        options={[{ value: '', label: t('wizard.select') }, ...filteredFailureModes.map(fm => ({ value: fm.id, label: fm.name }))]}
                        value={data.failure_mode_id}
                        onChange={(e) => onChange('failure_mode_id', e.target.value)}
                        disabled={!data.specialty_id}
                        error={errors?.failure_mode_id}
                    />

                    <Select
                        label={t('wizard.step3.failureCategory')}
                        required
                        options={[{ value: '', label: t('wizard.select') }, ...taxonomy.failureCategories.map(fc => ({ value: fc.id, label: fc.name }))]}
                        value={data.failure_category_id}
                        onChange={(e) => onChange('failure_category_id', e.target.value)}
                        error={errors?.failure_category_id}
                    />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('wizard.step3.quantitativeData')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label={t('wizard.step3.downtimeMinutes')}
                        type="number"
                        required
                        placeholder="0"
                        value={data.downtime_minutes}
                        onChange={(e) => onChange('downtime_minutes', parseInt(e.target.value) || 0)}
                    />

                    <Input
                        label={t('wizard.step3.financialImpact')}
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={data.financial_impact}
                        onChange={(e) => onChange('financial_impact', parseFloat(e.target.value) || 0)}
                    />
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>{t('wizard.step3.estimatedImpact')}</strong>{' '}
                        {(data.financial_impact || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        })} em {data.downtime_minutes || 0} {t('wizard.step3.minutesOfDowntime')}
                    </p>
                </div>
            </div>
        </div>
    );
};
