
import React, { useState, useMemo } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { TriggerRecord, AssetNode, TaxonomyConfig } from '../types';
import { generateId, filterAssetsByUsage } from '../services/utils';
import { Plus, Edit2, Trash2, Link, ExternalLink, AlertCircle, Clock, CheckCircle, FileText, X } from 'lucide-react';
import { AssetSelector } from './AssetSelector';
import { ConfirmModal } from './ConfirmModal';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';

interface TriggersViewProps {
    onCreateRca: (trigger: TriggerRecord) => void;
    onOpenRca: (rcaId: string) => void;
}

export const TriggersView: React.FC<TriggersViewProps> = ({ onCreateRca, onOpenRca }) => {
    const { triggers, assets, taxonomy, records, addTrigger, updateTrigger, deleteTrigger } = useRcaContext();

    // Debug Overlay (Temporary)
    // Defensive check
    if (!taxonomy || !assets) return <div className="p-8">Loading configuration...</div>;

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState<TriggerRecord | null>(null);

    // Confirm Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [triggerToDelete, setTriggerToDelete] = useState<string | null>(null);

    // Link RCA Modal State (Performance Optimization)
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [triggerToLink, setTriggerToLink] = useState<TriggerRecord | null>(null);

    const openLinkModal = (t: TriggerRecord) => {
        setTriggerToLink(t);
        setLinkModalOpen(true);
    };

    const closeLinkModal = () => {
        setLinkModalOpen(false);
        setTriggerToLink(null);
    };

    // --- Persistent Filter State ---
    const defaultFilters: FilterState = {
        searchTerm: '',
        year: '',
        months: [],
        status: 'ALL',
        area: 'ALL',
        equipment: 'ALL',
        subgroup: 'ALL',
        specialty: 'ALL', // Not used in triggers but required by type
        analysisType: 'ALL',
        failureMode: 'ALL',
        failureCategory: 'ALL',
        componentType: 'ALL',
        rootCause6M: 'ALL'
    };

    const { showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal } = useFilterPersistence(
        'rca_triggers_view_v1',
        defaultFilters,
        true
    );

    // --- Helpers ---
    const getAssetName = (id: string, nodes: AssetNode[]): string => {
        for (const node of nodes) {
            if (node.id === id) return node.name;
            if (node.children) {
                const found = getAssetName(id, node.children);
                if (found) return found;
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
        switch (name) {
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
        setEditingTrigger({ ...t });
        setIsModalOpen(true);
    };

    // Abre modal de confirmação de exclusão
    const handleDelete = (id: string) => {
        setTriggerToDelete(id);
        setDeleteModalOpen(true);
    };

    // Confirma exclusão após modal
    const confirmDelete = async () => {
        if (!triggerToDelete) return;
        try {
            await deleteTrigger(triggerToDelete);
            console.log('✅ Trigger excluído:', triggerToDelete);
        } catch (error) {
            console.error('❌ Erro ao excluir trigger:', error);
        }
        setDeleteModalOpen(false);
        setTriggerToDelete(null);
    };

    const handleSave = () => {
        if (!editingTrigger) return;

        // Validação de Campos Obrigatórios
        if (!editingTrigger.start_date) {
            alert("A Data de Início é obrigatória.");
            return;
        }

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
        const doneStatus = taxonomy.triggerStatuses?.find(s => s.name === 'Concluída')?.id || trigger.status;
        updateTrigger({ ...trigger, rca_id: rcaId, status: doneStatus });
    };

    const handleCreateRca = (trigger: TriggerRecord) => {
        // Delega para App.tsx que já faz:
        // 1. Gera novo RCA com dados do trigger
        // 2. Abre o editor
        // 3. Atualiza o trigger com rca_id e status 'ANALYSIS'
        onCreateRca(trigger);
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
                if (n.type === 'AREA') update.area_id = n.id;
                if (n.type === 'EQUIPMENT') update.equipment_id = n.id;
                if (n.type === 'SUBGROUP') update.subgroup_id = n.id;
            });
        } else {
            // Fallback if path not found (direct assignment)
            if (node.type === 'SUBGROUP') update.subgroup_id = node.id;
        }

        setEditingTrigger(update);
    };

    // --- Dynamic Options for Filters ---
    const dynamicOptions = useMemo(() => {
        // Helper: Global filters (Date, Search)
        const matchesGlobal = (t: TriggerRecord) => {
            const searchLower = filters.searchTerm.toLowerCase();
            const matchesSearch = !filters.searchTerm ||
                (t.stop_reason || '').toLowerCase().includes(searchLower) ||
                (t.stop_type || '').toLowerCase().includes(searchLower) ||
                (t.comments || '').toLowerCase().includes(searchLower) ||
                (t.responsible || '').toLowerCase().includes(searchLower) ||
                (t.id || '').toLowerCase().includes(searchLower);

            const tDate = new Date(t.start_date);
            const matchesYear = !filters.year || tDate.getFullYear().toString() === filters.year;

            const tMonth = (tDate.getMonth() + 1).toString().padStart(2, '0');
            const matchesMonth = (filters.months || []).length === 0 || (filters.months || []).includes(tMonth);

            return matchesSearch && matchesYear && matchesMonth;
        };

        // Helper: Asset filters
        const matchesAssets = (t: TriggerRecord) => {
            if (filters.subgroup !== 'ALL' && t.subgroup_id !== filters.subgroup) return false;
            if (filters.equipment !== 'ALL' && t.equipment_id !== filters.equipment) return false;
            if (filters.area !== 'ALL' && t.area_id !== filters.area) return false;
            return true;
        };

        // Helper: Attribute filters
        const matchesAttributes = (t: TriggerRecord, ignore: 'status' | 'type' | null) => {
            if (ignore !== 'status' && filters.status !== 'ALL' && t.status !== filters.status) return false;
            if (ignore !== 'type' && filters.analysisType !== 'ALL' && t.analysis_type_id !== filters.analysisType) return false;
            return true;
        };

        // 1. Assets: Match Global + Attributes
        const triggersForAssets = triggers.filter(t => matchesGlobal(t) && matchesAttributes(t, null));
        const usedAssetIds = new Set<string>();
        triggersForAssets.forEach(t => {
            if (t.area_id) usedAssetIds.add(t.area_id);
            if (t.equipment_id) usedAssetIds.add(t.equipment_id);
            if (t.subgroup_id) usedAssetIds.add(t.subgroup_id);
        });

        // 2. Statuses: Match Global + Assets + Attributes(ignore Status)
        const triggersForStatuses = triggers.filter(t => matchesGlobal(t) && matchesAssets(t) && matchesAttributes(t, 'status'));
        const usedStatuses = new Set(triggersForStatuses.map(t => t.status));

        // 3. Types: Match Global + Assets + Attributes(ignore Type)
        const triggersForTypes = triggers.filter(t => matchesGlobal(t) && matchesAssets(t) && matchesAttributes(t, 'type'));
        const usedTypes = new Set(triggersForTypes.map(t => t.analysis_type_id));

        return {
            assets: filterAssetsByUsage(assets, usedAssetIds),
            statuses: (taxonomy.triggerStatuses || []).filter(s => usedStatuses.has(s.id)),
            analysisTypes: (taxonomy.analysisTypes || []).filter(t => usedTypes.has(t.id))
        };
    }, [triggers, assets, taxonomy, filters]);

    const filteredTriggers = useMemo(() => {
        return triggers.filter(t => {
            // Text Search
            const searchLower = (filters.searchTerm || '').toLowerCase();
            const matchesSearch = !filters.searchTerm ||
                (t.stop_reason || '').toLowerCase().includes(searchLower) ||
                (t.stop_type || '').toLowerCase().includes(searchLower) ||
                (t.comments || '').toLowerCase().includes(searchLower) ||
                (t.responsible || '').toLowerCase().includes(searchLower) ||
                (t.id || '').toLowerCase().includes(searchLower);

            // Date (Year Only if set)
            const tDate = new Date(t.start_date);
            const isValidDate = !isNaN(tDate.getTime());

            let matchesYear = true;
            let matchesMonth = true;

            if (isValidDate) {
                matchesYear = !filters.year || tDate.getFullYear().toString() === filters.year;
                // Defensive check: (filters.months || [])
                const tMonth = (tDate.getMonth() + 1).toString().padStart(2, '0');
                matchesMonth = (filters.months || []).length === 0 || (filters.months || []).includes(tMonth);
            }

            // Dropdown Filters
            const matchesStatus = filters.status === 'ALL' || t.status === filters.status;
            const matchesType = filters.analysisType === 'ALL' || t.analysis_type_id === filters.analysisType;

            // Assets Hierarchy
            let matchesAsset = true;
            if (filters.subgroup !== 'ALL') matchesAsset = t.subgroup_id === filters.subgroup;
            else if (filters.equipment !== 'ALL') matchesAsset = t.equipment_id === filters.equipment;
            else if (filters.area !== 'ALL') matchesAsset = t.area_id === filters.area;

            return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesAsset && matchesType;
        }).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }, [triggers, filters]);

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col relative">
            {/* Debug Overlay (Hidden by default unless uncommented/flagged) */}
            {/* 
            <div className="absolute top-0 right-0 bg-slate-100 p-2 text-[10px] z-50 opacity-50 hover:opacity-100">
                Debug: {triggers.length} Triggers | {assets.length} Assets | Tax: {!!taxonomy ? 'OK' : 'FAIL'}
            </div>
            */}

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
            <FilterBar
                isOpen={showFilters}
                onToggle={() => setShowFilters(!showFilters)}
                filters={filters}
                onFilterChange={setFilters}
                onReset={() => handleReset(defaultFilters)}
                totalResults={filteredTriggers.length}
                config={{
                    showSearch: true,
                    showDate: true,
                    showStatus: true,
                    showAssetHierarchy: true,
                    showAnalysisType: true,
                    showSpecialty: false
                }}
                options={{
                    statuses: dynamicOptions.statuses,
                    analysisTypes: dynamicOptions.analysisTypes,
                    assets: dynamicOptions.assets
                }}
                isGlobal={isGlobal}
                onGlobalToggle={toggleGlobal}
            />

            {/* Data Table */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">Farol</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Data Início</th>
                                <th className="px-4 py-3">Área</th>
                                <th className="px-4 py-3">Equipamento</th>
                                <th className="px-4 py-3">Subconjunto</th>
                                <th className="px-4 py-3">Duração</th>
                                <th className="px-4 py-3">Tipo / Razão</th>
                                <th className="px-4 py-3">Tipo AF</th>
                                <th className="px-4 py-3">Responsável</th>
                                <th className="px-4 py-3">RCA Link (ID AF)</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTriggers.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center text-slate-400">
                                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                        No triggers found matching your criteria.
                                    </td>
                                </tr>
                            )}
                            {/* Performance Limit: Show only top 100 */}
                            {filteredTriggers.slice(0, 100).map(t => {
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
                                        <td className="px-4 py-3 font-mono">{t.start_date?.replace('T', ' ') || '-'}</td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(t.area_id, assets)}>{getAssetName(t.area_id, assets)}</td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(t.equipment_id, assets)}>{getAssetName(t.equipment_id, assets)}</td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(t.subgroup_id, assets)}>{getAssetName(t.subgroup_id, assets)}</td>
                                        <td className="px-4 py-3 font-bold">{t.duration_minutes} min</td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <div className="font-bold text-slate-800">{t.stop_type}</div>
                                            <div className="truncate text-slate-400" title={t.stop_reason}>{t.stop_reason}</div>
                                        </td>
                                        <td className="px-4 py-3">{analysisTypeName}</td>
                                        <td className="px-4 py-3">{t.responsible}</td>
                                        <td className="px-4 py-3">
                                            {t.rca_id ? (
                                                <div
                                                    className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded w-fit cursor-pointer hover:bg-blue-100 transition-colors"
                                                    onClick={() => onOpenRca(t.rca_id!)}
                                                    title="Clique para abrir a RCA"
                                                >
                                                    <Link size={12} /> {linkedRca?.what ? linkedRca.what.substring(0, 15) + '...' : t.rca_id}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleCreateRca(t)} className="text-green-600 bg-green-50 hover:bg-green-100 p-1.5 rounded flex items-center gap-1" title="Create New RCA">
                                                        <Plus size={14} /> New
                                                    </button>
                                                    <button
                                                        onClick={() => openLinkModal(t)}
                                                        className="text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1.5 rounded flex items-center gap-1 text-[10px]"
                                                        title="Vincular RCA Existente"
                                                    >
                                                        <Link size={14} /> Link...
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-blue-600 mr-2"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredTriggers.length > 100 && (
                        <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                            Mostrando 100 de {filteredTriggers.length} registros. Use os filtros para refinar.
                        </div>
                    )}
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
                                        onChange={e => setEditingTrigger({ ...editingTrigger, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Data/Hora Fim</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.end_date}
                                        onChange={e => setEditingTrigger({ ...editingTrigger, end_date: e.target.value })}
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
                                        onChange={e => setEditingTrigger({ ...editingTrigger, stop_type: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Razão Parada</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.stop_reason}
                                        onChange={e => setEditingTrigger({ ...editingTrigger, stop_reason: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tipo AF</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.analysis_type_id}
                                        onChange={e => setEditingTrigger({ ...editingTrigger, analysis_type_id: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        {(taxonomy.analysisTypes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Responsável</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTrigger.responsible}
                                        onChange={e => setEditingTrigger({ ...editingTrigger, responsible: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingTrigger.status}
                                    onChange={e => setEditingTrigger({ ...editingTrigger, status: e.target.value as any })}
                                >
                                    {(taxonomy.triggerStatuses || []).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>



                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Comentários</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none h-20"
                                    value={editingTrigger.comments}
                                    onChange={e => setEditingTrigger({ ...editingTrigger, comments: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Save Trigger</button>
                            </div>
                        </div>
                    </div>
                </div >
            )}

            {/* Modal de Link RCA (Performance Optimization) */}
            {
                linkModalOpen && triggerToLink && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">Vincular RCA</h3>
                                <button onClick={closeLinkModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-slate-600">Selecione a RCA para vincular ao Trigger <strong>{triggerToLink.id}</strong>:</p>

                                <select
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleLinkRca(triggerToLink, e.target.value);
                                            closeLinkModal();
                                        }
                                    }}
                                    value=""
                                >
                                    <option value="">Selecione uma RCA...</option>
                                    {records.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.id} - {(r.what || '').substring(0, 40)}...
                                        </option>
                                    ))}
                                </select>

                                <div className="flex justify-end pt-2">
                                    <button onClick={closeLinkModal} className="text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Excluir Trigger"
                message="Tem certeza que deseja excluir este trigger? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setTriggerToDelete(null);
                }}
                variant="danger"
            />
        </div >
    );
};
