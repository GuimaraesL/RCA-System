
import React, { useState, useMemo } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { TriggerRecord, AssetNode, TaxonomyConfig } from '../types';
import { generateId } from '../services/storageService';
import { Plus, Edit2, Trash2, Link, ExternalLink, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { AssetSelector } from './AssetSelector';

interface TriggersViewProps {
    onCreateRca: (trigger: TriggerRecord) => void;
}

export const TriggersView: React.FC<TriggersViewProps> = ({ onCreateRca }) => {
    const { triggers, assets, taxonomy, records, addTrigger, updateTrigger, deleteTrigger } = useRcaContext();
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState<TriggerRecord | null>(null);

    // Filter State
    const [statusFilter, setStatusFilter] = useState('ALL');

    // --- Helpers ---
    const getAssetName = (id: string, nodes: AssetNode[]): string => {
        for(const node of nodes) {
            if(node.id === id) return node.name;
            if(node.children) {
                const found = getAssetName(id, node.children);
                if(found) return found;
            }
        }
        return id; // fallback to ID if not found
    };

    const getTaxonomyName = (list: any[], id: string) => {
        const item = list?.find(i => i.id === id);
        return item ? item.name : id;
    };

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return 0;
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return Math.floor(diff / 60000); // Minutes
    };

    const findAssetPath = (nodes: AssetNode[], targetId: string): AssetNode[] | null => {
        for (const node of nodes) {
            if (node.id === targetId) return [node];
            if (node.children) {
                const path = findAssetPath(node.children, targetId);
                if (path) return [node, ...path];
            }
        }
        return null;
    };

    // Calculate Farol (Days Open)
    const getFarol = (startDate: string, statusId: string) => {
        if (!startDate) return { days: 0, color: 'bg-gray-100 text-gray-500' };
        
        // Lookup status name to determine behavior
        const statusName = getTaxonomyName(taxonomy.triggerStatuses, statusId);
        
        // Stop counting if Concluded or Removed
        const isClosed = statusName === 'Concluída' || statusName === 'Removido' || statusName === 'Ignorada' || statusName === 'CONVERTED';

        // Styling based on time open
        const start = new Date(startDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let color = 'bg-green-100 text-green-700';
        if (days >= 3) color = 'bg-yellow-100 text-yellow-700';
        if (days >= 7) color = 'bg-red-100 text-red-700';

        if (isClosed) {
             color = 'bg-gray-100 text-gray-400'; // Dimmed for closed items
        }

        return { days, color };
    };

    // Helper to get status badge color based on name (Hardcoded map for known statuses, fallback for others)
    const getStatusColor = (statusId: string) => {
        const name = getTaxonomyName(taxonomy.triggerStatuses, statusId);
        switch(name) {
            case 'Não iniciada': return 'bg-gray-100 text-gray-600';
            case 'Em andamento': return 'bg-blue-100 text-blue-700';
            case 'Concluída': return 'bg-green-100 text-green-700';
            case 'Atrasada': return 'bg-red-100 text-red-700';
            case 'Removido': return 'bg-slate-200 text-slate-500 line-through';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    // --- Handlers ---
    const handleNew = () => {
        // Default to first status (usually 'Não iniciada')
        const defaultStatus = taxonomy.triggerStatuses?.[0]?.id || '';
        setEditingTrigger({
            id: '',
            area_id: '',
            equipment_id: '',
            subgroup_id: '',
            start_date: new Date().toISOString().slice(0, 16),
            end_date: new Date().toISOString().slice(0, 16),
            duration_minutes: 0,
            stop_type: 'Falha',
            stop_reason: '',
            comments: '',
            analysis_type_id: '',
            status: defaultStatus,
            responsible: '',
            rca_id: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (t: TriggerRecord) => {
        setEditingTrigger({...t});
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if(confirm('Delete this trigger?')) deleteTrigger(id);
    };

    const handleSave = () => {
        if (!editingTrigger) return;
        const toSave = {
            ...editingTrigger,
            duration_minutes: calculateDuration(editingTrigger.start_date, editingTrigger.end_date)
        };

        if (!toSave.id) toSave.id = generateId('TRG');
        
        if (triggers.find(t => t.id === toSave.id)) {
            updateTrigger(toSave);
        } else {
            addTrigger(toSave);
        }
        setIsModalOpen(false);
    };

    const handleLinkRca = (trigger: TriggerRecord, rcaId: string) => {
        // Find 'Concluída' or 'Em andamento' status ID? 
        // For linking, usually it implies 'Em andamento' or 'Concluída'. 
        // Let's set to 'Concluída' if available, else keep current or use logic.
        const doneStatus = taxonomy.triggerStatuses.find(s => s.name === 'Concluída')?.id || trigger.status;
        updateTrigger({ ...trigger, rca_id: rcaId, status: doneStatus });
    };

    const handleCreateRca = (trigger: TriggerRecord) => {
        onCreateRca(trigger);
        // Find 'Em andamento' status ID
        const progressStatus = taxonomy.triggerStatuses.find(s => s.name === 'Em andamento')?.id || trigger.status;
        updateTrigger({ ...trigger, status: progressStatus });
    };

    const handleAssetSelect = (node: AssetNode) => {
        if (!editingTrigger) return;
        
        // Find path to populate all levels (Area > Equipment > Subgroup)
        const path = findAssetPath(assets, node.id);
        
        const update = { ...editingTrigger };
        
        // Reset fields
        update.area_id = '';
        update.equipment_id = '';
        update.subgroup_id = '';

        if (path) {
            path.forEach(n => {
                if(n.type === 'AREA') update.area_id = n.id;
                if(n.type === 'EQUIPMENT') update.equipment_id = n.id;
                if(n.type === 'SUBGROUP') update.subgroup_id = n.id;
            });
        } else {
            // Fallback if path not found (direct assignment)
            if (node.type === 'SUBGROUP') update.subgroup_id = node.id;
        }
        
        setEditingTrigger(update);
    };

    const filteredTriggers = useMemo(() => {
        return triggers.filter(t => statusFilter === 'ALL' || t.status === statusFilter)
                       .sort((a,b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }, [triggers, statusFilter]);

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Trigger Analysis Control</h1>
                    <p className="text-slate-500 mt-1">Manage downtime events and convert triggers to Root Cause Analyses.</p>
                </div>
                <button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                    <Plus size={18} /> New Trigger
                </button>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex gap-4 items-center shadow-sm">
                <span className="text-sm font-bold text-slate-500 uppercase">Status Filter:</span>
                <select 
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-900"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">All</option>
                    {taxonomy.triggerStatuses?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

            {/* Data Table */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">Farol</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Data Início</th>
                                <th className="px-4 py-3">Equipamento / Subconjunto</th>
                                <th className="px-4 py-3">Duração</th>
                                <th className="px-4 py-3">Tipo / Razão</th>
                                <th className="px-4 py-3">Tipo AF</th>
                                <th className="px-4 py-3">Responsável</th>
                                <th className="px-4 py-3">RCA Link (ID AF)</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTriggers.map(t => {
                                const farol = getFarol(t.start_date, t.status);
                                const assetName = getAssetName(t.subgroup_id || t.equipment_id || t.area_id, assets);
                                const analysisTypeName = getTaxonomyName(taxonomy.analysisTypes, t.analysis_type_id);
                                const linkedRca = records.find(r => r.id === t.rca_id);
                                const statusName = getTaxonomyName(taxonomy.triggerStatuses, t.status);

                                return (
                                    <tr key={t.id} className="hover:bg-slate-50 group">
                                        <td className="px-4 py-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${farol.color}`}>
                                                {farol.days}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(t.status)}`}>
                                                {statusName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono">{t.start_date.replace('T', ' ')}</td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={assetName}>{assetName}</td>
                                        <td className="px-4 py-3 font-bold">{t.duration_minutes} min</td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <div className="font-bold text-slate-800">{t.stop_type}</div>
                                            <div className="truncate text-slate-400" title={t.stop_reason}>{t.stop_reason}</div>
                                        </td>
                                        <td className="px-4 py-3">{analysisTypeName}</td>
                                        <td className="px-4 py-3">{t.responsible}</td>
                                        <td className="px-4 py-3">
                                            {t.rca_id ? (
                                                <div className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded w-fit">
                                                    <Link size={12}/> {linkedRca ? linkedRca.what.substring(0, 15) + '...' : t.rca_id}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleCreateRca(t)} className="text-green-600 bg-green-50 hover:bg-green-100 p-1.5 rounded flex items-center gap-1" title="Create New RCA">
                                                        <Plus size={14} /> New
                                                    </button>
                                                    <select 
                                                        className="w-24 text-[10px] border rounded bg-white text-slate-900"
                                                        onChange={(e) => { if(e.target.value) handleLinkRca(t, e.target.value); }}
                                                        value=""
                                                    >
                                                        <option value="">Link...</option>
                                                        {records.map(r => <option key={r.id} value={r.id}>{r.id} - {r.what.substring(0,10)}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-blue-600 mr-2"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && editingTrigger && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Edit Trigger Event</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Data/Hora Início</label>
                                    <input 
                                        type="datetime-local" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.start_date} 
                                        onChange={e => setEditingTrigger({...editingTrigger, start_date: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Data/Hora Fim</label>
                                    <input 
                                        type="datetime-local" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.end_date} 
                                        onChange={e => setEditingTrigger({...editingTrigger, end_date: e.target.value})} 
                                    />
                                </div>
                            </div>

                            {/* Asset Selection (Simplified) */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Subconjunto / Equipamento (Select)</label>
                                <div className="border rounded h-32 overflow-auto bg-slate-50 mb-2">
                                    <AssetSelector 
                                        assets={assets} 
                                        onSelect={handleAssetSelect} 
                                        selectedAssetId={editingTrigger.subgroup_id || editingTrigger.equipment_id}
                                        selectableTypes={['SUBGROUP']}
                                    />
                                </div>
                                <div className="text-xs text-blue-600">
                                    Selected: {getAssetName(editingTrigger.subgroup_id || editingTrigger.equipment_id || editingTrigger.area_id, assets)}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tipo Parada</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.stop_type} 
                                        onChange={e => setEditingTrigger({...editingTrigger, stop_type: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Razão Parada</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.stop_reason} 
                                        onChange={e => setEditingTrigger({...editingTrigger, stop_reason: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tipo AF</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.analysis_type_id} 
                                        onChange={e => setEditingTrigger({...editingTrigger, analysis_type_id: e.target.value})}
                                    >
                                        <option value="">Select...</option>
                                        {taxonomy.analysisTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Responsável</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.responsible} 
                                        onChange={e => setEditingTrigger({...editingTrigger, responsible: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                                <select 
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingTrigger.status} 
                                    onChange={e => setEditingTrigger({...editingTrigger, status: e.target.value as any})}
                                >
                                    {taxonomy.triggerStatuses?.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Comentários</label>
                                <textarea 
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none h-20"
                                    value={editingTrigger.comments} 
                                    onChange={e => setEditingTrigger({...editingTrigger, comments: e.target.value})} 
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Save Trigger</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
