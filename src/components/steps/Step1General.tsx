
import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { AssetNode, RcaRecord, TaxonomyConfig } from '../../types';
import { AssetSelector } from '../AssetSelector';
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
}

export const Step1General: React.FC<Step1Props> = ({ data, onChange, assets, taxonomy, onAssetSelect, onRefreshAssets, errors }) => {
    const { t } = useLanguage();

    // Helper for mandatory fields
    const requiredFields = taxonomy?.mandatoryFields?.rca?.create || [];
    const isRequired = (field: string) => requiredFields.includes(field);

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
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-xl font-bold text-gray-900">{t('wizard.step1.title')}</h2>
                    <button onClick={onRefreshAssets} className="text-blue-500 text-xs flex items-center gap-1 hover:text-blue-700">
                        <RefreshCw size={12} /> {t('wizard.step1.refreshAssets')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Asset Tree */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('wizard.step1.assetSelectorLabel')} {isRequired('subgroup_id') && <span className="text-red-500">*</span>}</label>
                        <div className={`border rounded h-64 overflow-auto mb-2 bg-slate-50 ${errors?.subgroup_id ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200'}`}>
                            <AssetSelector
                                assets={assets}
                                onSelect={onAssetSelect}
                                selectedAssetId={data.subgroup_id}
                                selectableTypes={['SUBGROUP']}
                            />
                        </div>
                        {errors?.subgroup_id && <span className="text-[10px] text-red-500 font-medium block mb-2">{t('wizard.step1.subgroupRequired')}</span>}
                        <div className="p-3 bg-blue-50 rounded border border-blue-100 text-xs text-blue-800 space-y-1">
                            <div><strong>{t('wizard.step1.area')}:</strong> {getAssetName(data.area_id, assets) || '-'}</div>
                            <div><strong>{t('wizard.step1.equipment')}:</strong> {getAssetName(data.equipment_id, assets) || '-'}</div>
                            <div><strong>{t('wizard.step1.subgroup')}:</strong> {getAssetName(data.subgroup_id, assets) || '-'}</div>
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="space-y-4">
                        <Select
                            label={t('wizard.step1.componentType')}
                            required={isRequired('component_type')}
                            options={[{ value: '', label: t('wizard.selectType') }, ...taxonomy.componentTypes.map(t => ({ value: t.id, label: t.name }))]}
                            value={data.component_type}
                            onChange={(e) => onChange('component_type', e.target.value)}
                            error={errors?.component_type}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label={t('wizard.step1.failureDate')}
                                type="date"
                                required={isRequired('failure_date')}
                                value={data.failure_date}
                                onChange={(e) => onChange('failure_date', e.target.value)}
                                error={errors?.failure_date}
                            />
                            <Input
                                label={t('wizard.step1.failureTime')}
                                type="time"
                                required={isRequired('failure_time')}
                                value={data.failure_time}
                                onChange={(e) => onChange('failure_time', e.target.value)}
                                error={errors?.failure_time}
                            />
                        </div>

                        <Input
                            label={t('wizard.step1.osNumber')}
                            value={data.os_number}
                            onChange={(e) => onChange('os_number', e.target.value)}
                            required={isRequired('os_number')}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">{t('wizard.step1.analysisMetadata')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <Select
                        label={t('wizard.step1.analysisType')}
                        required={isRequired('analysis_type')}
                        options={[{ value: '', label: t('wizard.select') }, ...taxonomy.analysisTypes.map(t => ({ value: t.id, label: t.name }))]}
                        value={data.analysis_type}
                        onChange={(e) => onChange('analysis_type', e.target.value)}
                        error={errors?.analysis_type}
                    />
                    <Input
                        label={t('wizard.step1.facilitator')}
                        value={data.facilitator}
                        onChange={(e) => onChange('facilitator', e.target.value)}
                        required={isRequired('facilitator')}
                    />
                    <Input
                        label={t('wizard.step1.analysisDuration')}
                        type="number"
                        placeholder={t('fields.durationPlaceholder')}
                        value={data.analysis_duration_minutes || 0}
                        onChange={(e) => onChange('analysis_duration_minutes', Number(e.target.value))}
                    />
                    <Input
                        label={t('wizard.step1.participants')}
                        required={isRequired('participants')}
                        placeholder={t('wizard.step1.participantsPlaceholder')}
                        value={data.participants.join(', ')}
                        onChange={(e) => handleParticipantsChange(e.target.value)}
                        error={errors?.participants}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                        label={t('wizard.step1.startDate')}
                        type="date"
                        value={data.start_date || ''}
                        onChange={(e) => onChange('start_date', e.target.value)}
                        required={isRequired('start_date')}
                    />
                    <Input
                        label={t('wizard.step1.completionDate')}
                        type="date"
                        value={data.completion_date || ''}
                        onChange={(e) => onChange('completion_date', e.target.value)}
                        required={isRequired('completion_date')}
                    />
                    <div className="flex items-center pt-6">
                        <input
                            type="checkbox"
                            id="opSupport"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={data.requires_operation_support || false}
                            onChange={(e) => onChange('requires_operation_support', e.target.checked)}
                        />
                        <label htmlFor="opSupport" className="ml-2 text-sm font-medium text-gray-700">{t('wizard.step1.requiresOperation')}</label>
                    </div>
                </div>
            </div>
        </div>
    );
};
