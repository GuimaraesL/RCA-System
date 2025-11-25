
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
}

export const Step1General: React.FC<Step1Props> = ({ data, onChange, assets, taxonomy, onAssetSelect, onRefreshAssets }) => {
    
    const getAssetName = (id: string, nodes: AssetNode[]): string => {
        for(const node of nodes) {
            if(node.id === id) return node.name;
            if(node.children) {
                const found = getAssetName(id, node.children);
                if(found) return found;
            }
        }
        return '';
    };

    const handleParticipantsChange = (val: string) => {
        const parts = val.split(',').map(p => p.trimStart()); // keep partial entries until blur, or simplistic approach
        // Better: just store string and split on save? No, data model expects array.
        // UI Pattern: Input text, split on comma.
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
                         <div className="border rounded h-64 overflow-auto mb-2 bg-slate-50">
                            <AssetSelector 
                                assets={assets} 
                                onSelect={onAssetSelect} 
                                selectedAssetId={data.subgroup_id}
                                selectableTypes={['SUBGROUP']} 
                            />
                         </div>
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
                            options={[{value: '', label: 'Select Type...'}, ...taxonomy.componentTypes.map(t => ({value: t.id, label: t.name}))]}
                            value={data.component_type}
                            onChange={(e) => onChange('component_type', e.target.value)}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Failure Date"
                                type="date"
                                value={data.failure_date}
                                onChange={(e) => onChange('failure_date', e.target.value)}
                            />
                            <Input
                                label="Time"
                                type="time"
                                value={data.failure_time}
                                onChange={(e) => onChange('failure_time', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <Input
                                label="Downtime (min)"
                                type="number"
                                value={data.downtime_minutes}
                                onChange={(e) => onChange('downtime_minutes', Number(e.target.value))}
                            />
                            <Input
                                label="Impact ($)"
                                type="number"
                                value={data.financial_impact}
                                onChange={(e) => onChange('financial_impact', Number(e.target.value))}
                            />
                        </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Select
                        label="Analysis Type"
                        options={[{value: '', label: 'Select...'}, ...taxonomy.analysisTypes.map(t => ({value: t.id, label: t.name}))]}
                        value={data.analysis_type}
                        onChange={(e) => onChange('analysis_type', e.target.value)}
                    />
                    <Input
                        label="Facilitator"
                        value={data.facilitator}
                        onChange={(e) => onChange('facilitator', e.target.value)}
                    />
                    <Input
                        label="Participants"
                        placeholder="Ademir, Lucas, Paulo (Separated by comma)"
                        value={data.participants.join(', ')}
                        onChange={(e) => handleParticipantsChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};
