
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { TriggerRecord, AssetNode, TaxonomyConfig } from '../types';
import { generateId, filterAssetsByUsage } from '../services/utils';
import { Plus, Edit2, Trash2, Link, ExternalLink, AlertCircle, Clock, CheckCircle, Check, FileText, X } from 'lucide-react';
import { AssetSelector } from './AssetSelector';
import { RcaSelector } from './RcaSelector';
import { ConfirmModal } from './ConfirmModal';
import { FilterBar, FilterState } from './FilterBar';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { useSorting } from '../hooks/useSorting';
import { SortHeader } from './ui/SortHeader';
// useEnterAnimation disabled for performance (Issue #11)
import { animateModalEnter } from '../services/animations';
import { GenericErrorBoundary } from './GenericErrorBoundary';

import { useLanguage } from '../context/LanguageDefinition'; // i18n

interface TriggersViewProps {
    onCreateRca: (trigger: TriggerRecord) => void;
    onOpenRca: (rcaId: string) => void;
}

// Inline Trigger Modal Component for Animation
const TriggerModal = ({ editingTrigger, setEditingTrigger, setIsModalOpen, handleSave, t, assets, taxonomy, handleAssetSelect, getAssetName, validationErrors = [] }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (modalRef.current) {
            animateModalEnter(modalRef.current);
        }
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden opacity-0">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">{t('triggerModal.title')}</h3>
                </div>
                <div className="p-6 space-y-4">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.startDate')}</label>
                            <input
                                type="datetime-local"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${validationErrors.includes('start_date') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.start_date}
                                onChange={e => setEditingTrigger({ ...editingTrigger, start_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.endDate')}</label>
                            <input
                                type="datetime-local"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${validationErrors.includes('end_date') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.end_date}
                                onChange={e => setEditingTrigger({ ...editingTrigger, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Asset Selection (Simplified) */}
                    <div>
                        <label className={`block text-xs font-medium mb-1 ${validationErrors.includes('area_id') || validationErrors.includes('equipment_id') ? 'text-red-600' : 'text-slate-500'}`}>{t('triggerModal.subgroupSelect')}</label>
                        <div className={`border rounded h-32 overflow-auto bg-slate-50 mb-2 ${validationErrors.includes('area_id') || validationErrors.includes('equipment_id') ? 'border-red-500' : ''}`}>
                            <AssetSelector
                                assets={assets}
                                onSelect={handleAssetSelect}
                                selectedAssetId={editingTrigger.subgroup_id || editingTrigger.equipment_id}
                                selectableTypes={['SUBGROUP']}
                            />
                        </div>
                        <div className="text-xs text-blue-600">
                            {t('triggerModal.selected')} {getAssetName(editingTrigger.subgroup_id || editingTrigger.equipment_id || editingTrigger.area_id, assets)}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.stopType')}</label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${validationErrors.includes('stop_type') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.stop_type}
                                onChange={e => setEditingTrigger({ ...editingTrigger, stop_type: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.stopReason')}</label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${validationErrors.includes('stop_reason') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.stop_reason}
                                onChange={e => setEditingTrigger({ ...editingTrigger, stop_reason: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.analysisType')}</label>
                            <select
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${validationErrors.includes('analysis_type_id') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.analysis_type_id}
                                onChange={e => setEditingTrigger({ ...editingTrigger, analysis_type_id: e.target.value })}
                            >
                                <option value="">{t('triggerModal.selectPlaceholder')}</option>
                                {(taxonomy.analysisTypes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.responsible')}</label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${validationErrors.includes('responsible') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.responsible}
                                onChange={e => setEditingTrigger({ ...editingTrigger, responsible: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.status')}</label>
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
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.comments')}</label>
                        <textarea
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none h-20"
                            value={editingTrigger.comments}
                            onChange={e => setEditingTrigger({ ...editingTrigger, comments: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">{t('triggerModal.cancel')}</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">{t('triggerModal.save')}</button>
                    </div>
                </div>
            </div>
        </div >
    );
};


const TriggersViewBase: React.FC<TriggersViewProps> = ({ onCreateRca, onOpenRca }) => {
    const { t, formatDate } = useLanguage();
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
    // Refactored to Iterative BFS to prevent Maximum Call Stack Size Exceeded (Stack Overflow)
    const getAssetName = (id: string, nodes: AssetNode[]): string => {
        if (!id) return '';
        if (!nodes || nodes.length === 0) return id;

        const queue = [...nodes];
        // Use Set to prevent infinite loops in case of circular references in data
        const visited = new Set<string>();
        let safetyCounter = 0;

        while (queue.length > 0) {
            safetyCounter++;
            if (safetyCounter > 50000) {
                console.warn('getAssetName hit safety limit (possible cycle):', id);
                return id;
            }

            const node = queue.shift();
            if (!node) continue;

            if (visited.has(node.id)) continue;
            visited.add(node.id);

            if (node.id === id) return node.name;

            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    queue.push(child);
                }
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

        try {
            // Lookup status name to determine behavior
            const statusName = getTaxonomyName(taxonomy.triggerStatuses, statusId);

            // NEW LOGIC: If Concluded, show Checkmark and Green
            if (statusName === 'Concluída' || statusName === 'Concluido') {
                return { days: <Check size={16} strokeWidth={3} />, color: 'bg-green-100 text-green-700 border border-green-200' };
            }

            // Stop counting if Concluded or Removed
            const isClosed = statusName === 'Concluída' || statusName === 'Removido' || statusName === 'Ignorada' || statusName === 'CONVERTED';

            // Styling based on time open
            const start = new Date(startDate);
            if (isNaN(start.getTime())) return { days: 0, color: 'bg-gray-100 text-gray-500' }; // Handle invalid date

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
        } catch (e) {
            console.error("Error calculating Farol:", e);
            return { days: 0, color: 'bg-red-500 text-white' };
        }
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

    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const handleSave = () => {
        if (!editingTrigger) return;

        // Validação de Campos Obrigatórios (Client-Side)
        const requiredFields = [
            { field: 'start_date' },
            { field: 'end_date' },
            { field: 'area_id' },
            { field: 'equipment_id' },
            { field: 'stop_reason' },
            { field: 'stop_type' },
            { field: 'responsible' },
            { field: 'analysis_type_id' }
        ];

        const errors: string[] = [];
        for (const req of requiredFields) {
            if (!editingTrigger[req.field as keyof TriggerRecord]) {
                errors.push(req.field);
            }
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        // Clear errors if valid
        setValidationErrors([]);

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

    // --- Optimization: Pre-compute Search Context (Issue #11) ---
    const triggersWithContext = useMemo(() => {
        if (!Array.isArray(triggers)) {
            console.error("Triggers is not an array:", triggers);
            return [];
        }

        return triggers.map(t => {
            try {
                // Defensive: Ensure t exists
                if (!t) return null;

                const rcaTitle = t.rca_id && Array.isArray(records) ? (records.find(r => r.id === t.rca_id)?.what || t.rca_id) : '';
                const searchContext = `${t.stop_reason || ''} ${t.stop_type || ''} ${t.comments || ''} ${t.responsible || ''} ${t.id || ''} ${rcaTitle}`
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");

                let yearStr = '';
                let monthStr = '';

                if (t.start_date) {
                    const tDate = new Date(t.start_date);
                    const isValidDate = !isNaN(tDate.getTime());
                    yearStr = isValidDate ? tDate.getFullYear().toString() : '';
                    monthStr = isValidDate ? (tDate.getMonth() + 1).toString().padStart(2, '0') : '';
                }

                return { ...t, searchContext, yearStr, monthStr };
            } catch (err) {
                console.error("Error processing trigger for context:", t, err);
                return { ...t, searchContext: '', yearStr: '', monthStr: '' };
            }
        }).filter(t => t !== null) as (TriggerRecord & { searchContext: string, yearStr: string, monthStr: string })[];
    }, [triggers, records]);

    // --- Pagination State ---
    // Implements Client-Side Pagination to cap DOM nodes at 100.
    // This prevents browser lag while maintaining full filtering capabilities over the entire dataset.
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    const filteredContent = useMemo(() => {
        // Reset page when filters change (implicitly handled if we use formatted logic, 
        // but explicit effect or key change is safer. Here we rely on useEffect)

        // 1. Prepare Search Term (Normalized)
        const searchLower = (filters.searchTerm || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return triggersWithContext.filter(t => {
            // Text Search - O(1) check on pre-computed context
            const matchesSearch = !filters.searchTerm || t.searchContext.includes(searchLower);

            // Date (Year Only if set)
            let matchesYear = true;
            let matchesMonth = true;

            if (t.yearStr) {
                matchesYear = !filters.year || t.yearStr === filters.year;
                matchesMonth = (filters.months || []).length === 0 || (filters.months || []).includes(t.monthStr);
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
        });
    }, [triggersWithContext, filters]);

    // Sorting
    const { sortedItems: filteredTriggers, sortConfig, handleSort } = useSorting(filteredContent, { key: 'start_date', direction: 'desc' });

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    // Animation Ref
    // Animation Disabled (Performance Optimization)
    // const listRef = useEnterAnimation([filteredTriggers, currentPage]);

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{t('triggersPage.title')}</h1>
                    <p className="text-slate-500 mt-1">{t('triggersPage.manageDowntime')}</p>
                </div>
                <button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
                    <Plus size={18} /> {t('triggersPage.newTrigger')}
                </button>
            </div>

            {/* Filter */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
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
            </div>

            {/* Data Table */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 animate-in fade-in duration-700 delay-200">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10 group">
                            <tr>
                                <SortHeader label={t('triggersPage.table.status')} sortKey="start_date" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.status')} sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.date')} sortKey="start_date" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('filters.area')} sortKey="area_id" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('filters.equipment')} sortKey="equipment_id" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('filters.subgroup')} sortKey="subgroup_id" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.duration')} sortKey="duration_minutes" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('triggersPage.table.typeReason')} sortKey="stop_type" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.type')} sortKey="analysis_type_id" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('table.responsible')} sortKey="responsible" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label={t('triggersPage.table.rcaLink')} sortKey="rca_id" currentSort={sortConfig} onSort={handleSort} />
                                <th className="px-4 py-3 text-right">{t('triggersPage.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTriggers.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center text-slate-400">
                                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                        {t('triggersPage.noTriggers')}
                                    </td>
                                </tr>
                            )}
                            {/* Pagination Logic */}
                            {filteredTriggers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(trigger => {
                                const farol = getFarol(trigger.start_date, trigger.status);
                                const assetName = getAssetName(trigger.subgroup_id || trigger.equipment_id || trigger.area_id, assets);
                                const analysisTypeName = getTaxonomyName(taxonomy.analysisTypes, trigger.analysis_type_id);
                                const linkedRca = records.find(r => r.id === trigger.rca_id);
                                const statusName = getTaxonomyName(taxonomy.triggerStatuses, trigger.status);

                                return (
                                    <tr key={trigger.id} className="hover:bg-slate-50 group">
                                        <td className="px-4 py-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${farol.color}`}>
                                                {farol.days}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(trigger.status)}`}>
                                                {statusName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono">{formatDate(trigger.start_date)}</td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(trigger.area_id, assets)}>{getAssetName(trigger.area_id, assets)}</td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(trigger.equipment_id, assets)}>{getAssetName(trigger.equipment_id, assets)}</td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={getAssetName(trigger.subgroup_id, assets)}>{getAssetName(trigger.subgroup_id, assets)}</td>
                                        <td className="px-4 py-3 font-bold">{trigger.duration_minutes} min</td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <div className="font-bold text-slate-800">{trigger.stop_type}</div>
                                            <div className="truncate text-slate-400" title={trigger.stop_reason}>{trigger.stop_reason}</div>
                                        </td>
                                        <td className="px-4 py-3">{analysisTypeName}</td>
                                        <td className="px-4 py-3">{trigger.responsible}</td>
                                        <td className="px-4 py-3">
                                            {trigger.rca_id ? (
                                                <div
                                                    className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded w-fit cursor-pointer hover:bg-blue-100 transition-colors"
                                                    onClick={() => onOpenRca(trigger.rca_id!)}
                                                    title={t('triggersPage.tooltips.openRca')}
                                                >
                                                    <Link size={12} /> {linkedRca?.what ? linkedRca.what.substring(0, 15) + '...' : trigger.rca_id}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleCreateRca(trigger)} className="text-green-600 bg-green-50 hover:bg-green-100 p-1.5 rounded flex items-center gap-1" title={t('triggersPage.tooltips.createRca')}>
                                                        <Plus size={14} /> {t('triggersPage.buttons.new')}
                                                    </button>
                                                    <button
                                                        onClick={() => openLinkModal(trigger)}
                                                        className="text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1.5 rounded flex items-center gap-1 text-[10px]"
                                                        title={t('triggersPage.tooltips.linkRca')}
                                                    >
                                                        <Link size={14} /> {t('triggersPage.linkTrigger')}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEdit(trigger)} className="text-slate-400 hover:text-blue-600 mr-2"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(trigger.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredTriggers.length > 0 && (
                        <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-slate-50">
                            <div className="text-sm text-slate-500">
                                {t('pagination.showing')} <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> {t('pagination.to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTriggers.length)}</span> {t('pagination.of')} <span className="font-medium">{filteredTriggers.length}</span> {t('pagination.results')}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                                >
                                    {t('pagination.previous')}
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => (prev * itemsPerPage < filteredTriggers.length ? prev + 1 : prev))}
                                    disabled={currentPage * itemsPerPage >= filteredTriggers.length}
                                    className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                                >
                                    {t('pagination.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && editingTrigger && (
                <TriggerModal
                    editingTrigger={editingTrigger}
                    setEditingTrigger={setEditingTrigger}
                    setIsModalOpen={setIsModalOpen}
                    handleSave={handleSave}
                    t={t}
                    assets={assets}
                    taxonomy={taxonomy}
                    handleAssetSelect={handleAssetSelect}
                    getAssetName={getAssetName}
                    validationErrors={validationErrors}
                />
            )}

            {/* Modal de Link RCA (Performance Optimization) */}
            {
                linkModalOpen && triggerToLink && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        {/* Wrapper to control max size/centering */}
                        <div className="w-full max-w-2xl">
                            <RcaSelector
                                records={records}
                                assets={assets}
                                onSelect={(rcaId) => {
                                    handleLinkRca(triggerToLink, rcaId);
                                    closeLinkModal();
                                }}
                                onCancel={closeLinkModal}
                            />
                        </div>
                    </div>
                )
            }

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title={t('modals.deleteTitle')}
                message={t('modals.deleteTriggerMessage')}
                confirmText={t('modals.confirm')}
                cancelText={t('modals.cancel')}
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

export const TriggersView: React.FC<TriggersViewProps> = (props) => (
    <GenericErrorBoundary componentName="TriggersView">
        <TriggersViewBase {...props} />
    </GenericErrorBoundary>
);
