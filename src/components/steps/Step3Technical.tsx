/**
 * Proposta: Passo 3 do Wizard - Classificação Técnica e Impactos Quantitativos.
 * Fluxo: Gerencia a classificação da falha (Especialidade > Modo de Falha > Categoria) e captura dados numéricos de impacto (Downtime e Financeiro).
 */

import React, { useId } from 'react';
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
    const idPrefix = useId();

    /**
     * Lógica de Dropdown Dependente (Especialidade -> Modo de Falha).
     * Filtra a lista de modos de falha baseando-se na especialidade selecionada.
     */
    const filteredFailureModes = taxonomy.failureModes.filter(fm => {
        if (!data.specialty_id) return true;
        if (!fm.specialty_ids || fm.specialty_ids.length === 0) return true;
        return fm.specialty_ids.includes(data.specialty_id);
    });

    /**
     * Reseta automaticamente o Modo de Falha caso ele se torne inválido após uma troca de Especialidade.
     */
    React.useEffect(() => {
        if (data.failure_mode_id && data.specialty_id) {
            const isValid = filteredFailureModes.some(fm => fm.id === data.failure_mode_id);
            if (!isValid) {
                console.log('Sincronização: Resetando Modo de Falha devido a incompatibilidade com a Especialidade');
                onChange('failure_mode_id', '');
            }
        }
    }, [data.specialty_id, data.failure_mode_id, filteredFailureModes, onChange]);

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">{t('wizard.step3.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('wizard.step3.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <Select
                        id={`${idPrefix}-specialty`}
                        name="specialty"
                        label={t('wizard.step3.specialty')}
                        required={isFieldRequired('specialty_id')}
                        options={[{ value: '', label: t('wizard.select') }, ...taxonomy.specialties.map(t => ({ value: t.id, label: t.name }))]}
                        value={data.specialty_id}
                        onChange={(e) => onChange('specialty_id', e.target.value)}
                        error={errors?.specialty_id}
                    />

                    <Select
                        id={`${idPrefix}-failure_mode`}
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
                            id={`${idPrefix}-failure_category`}
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

                {/* Seção de Dados Quantitativos */}
                <div className="pt-8 border-t border-slate-50 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                        {t('wizard.step3.quantitativeData')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Input
                            id={`${idPrefix}-downtime_minutes`}
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
                            id={`${idPrefix}-financial_impact`}
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

                <div className="mt-8 p-5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                        $
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-100 leading-relaxed">
                        <strong className="font-bold">{t('wizard.step3.estimatedImpact')}</strong><br />
                        <span className="text-lg font-black dark:text-white">
                            {(data.financial_impact || 0).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            })}
                        </span>
                        <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium italic">
                            em {data.downtime_minutes || 0} {t('wizard.step3.minutesOfDowntime')}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};
