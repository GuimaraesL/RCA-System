/**
 * Proposta: Passo 1 do Wizard - Informações Gerais e Localização Técnica.
 * Fluxo: Gerencia a seleção de ativos na árvore, metadados da análise (facilitador, participantes) e dados cronológicos do evento.
 */

import React, { useId } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { AssetNode, RcaRecord, TaxonomyConfig } from '../../types';
import { AssetSelector } from '../selectors/AssetSelector';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';

interface Step1Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    assets: AssetNode[];
    taxonomy: TaxonomyConfig;
    onAssetSelect: (asset: AssetNode) => void;
    onRefreshAssets: () => void;
    errors?: Record<string, boolean>;
    isFieldRequired: (field: string) => boolean;
}

export const Step1General: React.FC<Step1Props> = ({ data, onChange, assets, taxonomy, onAssetSelect, onRefreshAssets, errors, isFieldRequired }) => {
    const { t } = useLanguage();
    const idPrefix = useId();

    const getAssetName = (id: string, nodes: AssetNode[]): string => {
        for (const node of nodes) {
            if (node.id === id) return node.name;
            if (node.children) {
                const found = getAssetName(id, node.children);
                if (found) return found;
            }
        }
        return '';
    };

    const handleParticipantsChange = (val: string) => {
        const parts = val.split(',').map(p => p.trimStart());
        onChange('participants', parts);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/60">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-900 font-display tracking-tight">{t('wizard.step1.title')}</h2>
                    <button onClick={onRefreshAssets} className="text-blue-600 text-xs font-semibold flex items-center gap-1.5 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        <RefreshCw size={14} /> {t('wizard.step1.refreshAssets')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Coluna Esquerda: Seletor de Ativos (Hierarquia) */}
                    <div>
                        <span id={`${idPrefix}-asset-selector-label`} className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            {t('wizard.step1.assetSelectorLabel')} {isFieldRequired('subgroup_id') && <span className="text-rose-500">*</span>}
                        </span>
                        <div 
                            id={`${idPrefix}-asset-selector-container`} 
                            aria-labelledby={`${idPrefix}-asset-selector-label`} 
                            className={`mb-4 rounded-xl border transition-all overflow-hidden ${
                                (errors?.subgroup_id || errors?.equipment_id || errors?.area_id) 
                                ? 'border-rose-300 ring-4 ring-rose-50' 
                                : 'border-slate-200'
                            }`}
                        >
                            <AssetSelector
                                assets={assets}
                                onSelect={onAssetSelect}
                                selectedAssetId={data.subgroup_id || data.equipment_id || data.area_id}
                                selectableTypes={['SUBGROUP']}
                            />
                        </div>
                        {(errors?.subgroup_id || errors?.equipment_id || errors?.area_id) && <span className="text-xs text-rose-500 font-medium block mb-3 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>{t('common.requiredField')}</span>}
                        
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-600 space-y-3 shadow-inner">
                            <div className="flex justify-between border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                                <strong className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{t('wizard.step1.area')}:</strong> 
                                <span className="font-black text-slate-900">{getAssetName(data.area_id, assets) || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                                <strong className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{t('wizard.step1.equipment')}:</strong> 
                                <span className="font-black text-slate-900">{getAssetName(data.equipment_id, assets) || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                                <strong className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{t('wizard.step1.subgroup')}:</strong> 
                                <span className="font-black text-slate-900">{getAssetName(data.subgroup_id, assets) || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Detalhes do Evento */}
                    <div className="space-y-6">
                        <Select
                            id={`${idPrefix}-component_type`}
                            label={t('wizard.step1.componentType')}
                            required={isFieldRequired('component_type')}
                            options={[{ value: '', label: t('wizard.selectType') }, ...taxonomy.componentTypes.map(t => ({ value: t.id, label: t.name }))]}
                            value={data.component_type}
                            onChange={(e) => onChange('component_type', e.target.value)}
                            error={errors?.component_type}
                        />

                        <div className="grid grid-cols-2 gap-6">
                            <Input
                                id={`${idPrefix}-failure_date`}
                                name="failure_date"
                                label={t('wizard.step1.failureDate')}
                                type="date"
                                required={isFieldRequired('failure_date')}
                                value={data.failure_date}
                                onChange={(e) => onChange('failure_date', e.target.value)}
                                error={errors?.failure_date}
                            />
                            <Input
                                id={`${idPrefix}-failure_time`}
                                name="failure_time"
                                label={t('wizard.step1.failureTime')}
                                type="time"
                                required={isFieldRequired('failure_time')}
                                value={data.failure_time}
                                onChange={(e) => onChange('failure_time', e.target.value)}
                                error={errors?.failure_time}
                            />
                        </div>

                        <Input
                            id={`${idPrefix}-os_number`}
                            name="os_number"
                            label={t('wizard.step1.osNumber')}
                            value={data.os_number}
                            onChange={(e) => onChange('os_number', e.target.value)}
                            required={isFieldRequired('os_number')}
                            error={errors?.os_number}
                        />
                    </div>
                </div>
            </div>

            {/* Seção de Metadados da Análise */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/60">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    {t('wizard.step1.analysisMetadata')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <Select
                        id={`${idPrefix}-analysis_type`}
                        name="analysis_type"
                        label={t('wizard.step1.analysisType')}
                        required={isFieldRequired('analysis_type')}
                        options={[{ value: '', label: t('wizard.select') }, ...taxonomy.analysisTypes.map(t => ({ value: t.id, label: t.name }))]}
                        value={data.analysis_type}
                        onChange={(e) => onChange('analysis_type', e.target.value)}
                        error={errors?.analysis_type}
                    />
                    <Input
                        id={`${idPrefix}-facilitator`}
                        name="facilitator"
                        label={t('wizard.step1.facilitator')}
                        value={data.facilitator}
                        onChange={(e) => onChange('facilitator', e.target.value)}
                        required={isFieldRequired('facilitator')}
                        error={errors?.facilitator}
                    />
                    <Input
                        id={`${idPrefix}-analysis_duration`}
                        name="analysis_duration"
                        label={t('wizard.step1.analysisDuration')}
                        type="number"
                        placeholder={t('fields.durationPlaceholder')}
                        value={data.analysis_duration_minutes || 0}
                        onChange={(e) => onChange('analysis_duration_minutes', Number(e.target.value))}
                        error={errors?.analysis_duration_minutes}
                    />
                    <div className="md:col-span-3">
                        <Input
                            id={`${idPrefix}-participants`}
                            name="participants"
                            label={t('wizard.step1.participants')}
                            required={isFieldRequired('participants')}
                            placeholder={t('wizard.step1.participantsPlaceholder')}
                            value={(data.participants || []).join(', ')}
                            onChange={(e) => handleParticipantsChange(e.target.value)}
                            error={errors?.participants}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-slate-50">
                    <Input
                        id={`${idPrefix}-start_date`}
                        name="start_date"
                        label={t('wizard.step1.startDate')}
                        type="date"
                        value={data.start_date || ''}
                        onChange={(e) => onChange('start_date', e.target.value)}
                        required={isFieldRequired('start_date')}
                        error={errors?.start_date}
                    />
                    <Input
                        id={`${idPrefix}-completion_date`}
                        name="completion_date"
                        label={t('wizard.step1.completionDate')}
                        type="date"
                        value={data.completion_date || ''}
                        onChange={(e) => onChange('completion_date', e.target.value)}
                        required={isFieldRequired('completion_date')}
                        error={errors?.completion_date}
                    />
                    <div className="flex items-center pt-8">
                        <div className="relative flex items-start">
                            <div className="flex h-5 items-center">
                                <input
                                    type="checkbox"
                                    id={`${idPrefix}-opSupport`}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={data.requires_operation_support || false}
                                    onChange={(e) => onChange('requires_operation_support', e.target.checked)}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor={`${idPrefix}-opSupport`} className="font-medium text-slate-700 cursor-pointer select-none">
                                    {t('wizard.step1.requiresOperation')}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
