
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
    isFieldRequired: (field: string) => boolean;
}

export const Step3Technical: React.FC<Step3Props> = ({ data, onChange, taxonomy, errors, isFieldRequired }) => {
    const { t } = useLanguage();

    // Helper for mandatory fields removed - using prop instead

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
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('wizard.step3.title')}</h2>
                <p className="text-gray-600 mb-6">{t('wizard.step3.subtitle')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Select
                        id="specialty"
                        name="specialty"
                        label={t('wizard.step3.specialty')}
                        required={isFieldRequired('specialty_id')}
                        options={[{ value: '', label: t('wizard.select') }, ...taxonomy.specialties.map(t => ({ value: t.id, label: t.name }))]}
                        value={data.specialty_id}
                        onChange={(e) => onChange('specialty_id', e.target.value)}
                        error={errors?.specialty_id}
                    />

                    <Select
                        id="failure_mode"
                        name="failure_mode"
                        label={t('wizard.step3.failureMode')}
                        required={isFieldRequired('failure_mode_id')}
                        options={[{ value: '', label: t('wizard.select') }, ...filteredFailureModes.map(t => ({ value: t.id, label: t.name }))]}
                        value={data.failure_mode_id}
                        onChange={(e) => onChange('failure_mode_id', e.target.value)}
                        error={errors?.failure_mode_id}
                    />

                    <div className="md:col-span-2">
                        <Select
                            id="failure_category"
                            name="failure_category"
                            label={t('wizard.step3.failureCategory')}
                            required={isFieldRequired('failure_category_id')}
                            options={[{ value: '', label: t('wizard.select') }, ...taxonomy.failureCategories.map(t => ({ value: t.id, label: t.name }))]}
                            value={data.failure_category_id}
                            onChange={(e) => onChange('failure_category_id', e.target.value)}
                            error={errors?.failure_category_id}
                        />
                    </div>
                </div>

                {/* Quantitative Data Section */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">
                        {t('wizard.step3.quantitativeData')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            id="downtime_minutes"
                            name="downtime_minutes"
                            type="number"
                            label={t('wizard.step3.downtimeMinutes')}
                            required={isFieldRequired('downtime_minutes')}
                            value={data.downtime_minutes || 0}
                            onChange={(e) => onChange('downtime_minutes', parseFloat(e.target.value))}
                            placeholder="0"
                            error={errors?.downtime_minutes}
                        />
                        <Input
                            id="financial_impact"
                            name="financial_impact"
                            type="number"
                            label={t('wizard.step3.financialImpact')}
                            required={isFieldRequired('financial_impact')}
                            value={data.financial_impact || 0}
                            onChange={(e) => onChange('financial_impact', parseFloat(e.target.value))}
                            placeholder="0.00"
                            error={errors?.financial_impact}
                        />
                    </div>
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
