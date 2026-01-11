
import React from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { AssetNode, RcaRecord, TaxonomyConfig } from '../../types';
import { AssetSelector } from '../AssetSelector';
import { RefreshCw } from 'lucide-react';

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
                    <h2 className="text-xl font-bold text-gray-900">0. Componente / Localização</h2>
                    <button onClick={onRefreshAssets} className="text-blue-500 text-xs flex items-center gap-1 hover:text-blue-700">
                        <RefreshCw size={12} /> Refresh Assets
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Asset Tree */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Asset Selector (Select Subgroup) <span className="text-red-500">*</span></label>
                        <div className={`border rounded h-64 overflow-auto mb-2 bg-slate-50 ${errors?.subgroup_id ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200'}`}>
                            <AssetSelector
                                assets={assets}
                                onSelect={onAssetSelect}
                                selectedAssetId={data.subgroup_id}
                                selectableTypes={['SUBGROUP']}
                            />
                        </div>
                        {errors?.subgroup_id && <span className="text-[10px] text-red-500 font-medium block mb-2">Selecione um subgrupo obrigatório</span>}
                        <div className="p-3 bg-blue-50 rounded border border-blue-100 text-xs text-blue-800 space-y-1">
                            <div><strong>Area:</strong> {getAssetName(data.area_id, assets) || '-'}</div>
                            <div><strong>Equipment:</strong> {getAssetName(data.equipment_id, assets) || '-'}</div>
                            <div><strong>Subgroup:</strong> {getAssetName(data.subgroup_id, assets) || '-'}</div>
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="space-y-4">
                        <Select
                            label="Component Type (Conforme lista)"
                            required
                            options={[{ value: '', label: 'Select Type...' }, ...taxonomy.componentTypes.map(t => ({ value: t.id, label: t.name }))]}
                            value={data.component_type}
                            onChange={(e) => onChange('component_type', e.target.value)}
                            error={errors?.component_type}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Failure Date"
                                type="date"
                                required
                                value={data.failure_date}
                                onChange={(e) => onChange('failure_date', e.target.value)}
                                error={errors?.failure_date}
                            />
                            <Input
                                label="Time"
                                type="time"
                                required
                                value={data.failure_time}
                                onChange={(e) => onChange('failure_time', e.target.value)}
                                error={errors?.failure_time}
                            />
                        </div>

                        {/* Removed Downtime and Impact Inputs (Moved to Step 3) */}
                        <Input
                            label="OS Number"
                            value={data.os_number}
                            onChange={(e) => onChange('os_number', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">Analysis Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <Select
                        label="Analysis Type"
                        required
                        options={[{ value: '', label: 'Select...' }, ...taxonomy.analysisTypes.map(t => ({ value: t.id, label: t.name }))]}
                        value={data.analysis_type}
                        onChange={(e) => onChange('analysis_type', e.target.value)}
                        error={errors?.analysis_type}
                    />
                    <Input
                        label="Facilitator"
                        value={data.facilitator}
                        onChange={(e) => onChange('facilitator', e.target.value)}
                    />
                    <Input
                        label="Duração da Análise (min)"
                        type="number"
                        placeholder="Ex: 60"
                        value={data.analysis_duration_minutes || 0}
                        onChange={(e) => onChange('analysis_duration_minutes', Number(e.target.value))}
                    />
                    <Input
                        label="Participants"
                        required
                        placeholder="Ademir, Lucas, Paulo (Separated by comma)"
                        value={data.participants.join(', ')}
                        onChange={(e) => handleParticipantsChange(e.target.value)}
                        error={errors?.participants}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                        label="Start Date (Inicio)"
                        type="date"
                        value={data.start_date || ''}
                        onChange={(e) => onChange('start_date', e.target.value)}
                    />
                    <Input
                        label="Completion Date (Conclusão)"
                        type="date"
                        value={data.completion_date || ''}
                        onChange={(e) => onChange('completion_date', e.target.value)}
                    />
                    <div className="flex items-center pt-6">
                        <input
                            type="checkbox"
                            id="opSupport"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={data.requires_operation_support || false}
                            onChange={(e) => onChange('requires_operation_support', e.target.checked)}
                        />
                        <label htmlFor="opSupport" className="ml-2 text-sm font-medium text-gray-700">Necessário operação na AF?</label>
                    </div>
                </div>
            </div>
        </div>
    );
};
