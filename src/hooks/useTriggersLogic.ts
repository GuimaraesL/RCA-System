
import { useState, useMemo } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { TriggerRecord, AssetNode } from '../types';
import { useFilterPersistence } from './useFilterPersistence';
import { useSorting } from './useSorting';
import { filterAssetsByUsage } from '../services/utils';
import { FilterState } from '../components/FilterBar';

export const useTriggersLogic = () => {
    const { triggers, assets, taxonomy, records, addTrigger, updateTrigger, deleteTrigger } = useRcaContext();

    // --- State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState<TriggerRecord | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [triggerToDelete, setTriggerToDelete] = useState<string | null>(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [triggerToLink, setTriggerToLink] = useState<TriggerRecord | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    // --- Persistent Filter State ---
    const defaultFilters: FilterState = {
        searchTerm: '',
        year: '',
        months: [],
        status: 'ALL',
        area: 'ALL',
        equipment: 'ALL',
        subgroup: 'ALL',
        specialty: 'ALL',
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

    // --- Filters Logic ---
    const dynamicOptions = useMemo(() => {
        if (!triggers || !assets || !taxonomy) return { assets: [], statuses: [], analysisTypes: [] };

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

        const triggersForAssets = triggers.filter(t => matchesGlobal(t) && matchesAttributes(t, null));
        const usedAssetIds = new Set<string>();
        triggersForAssets.forEach(t => {
            if (t.area_id) usedAssetIds.add(t.area_id);
            if (t.equipment_id) usedAssetIds.add(t.equipment_id);
            if (t.subgroup_id) usedAssetIds.add(t.subgroup_id);
        });

        const triggersForStatuses = triggers.filter(t => matchesGlobal(t) && matchesAssets(t) && matchesAttributes(t, 'status'));
        const usedStatuses = new Set(triggersForStatuses.map(t => t.status));

        const triggersForTypes = triggers.filter(t => matchesGlobal(t) && matchesAssets(t) && matchesAttributes(t, 'type'));
        const usedTypes = new Set(triggersForTypes.map(t => t.analysis_type_id));

        return {
            assets: filterAssetsByUsage(assets, usedAssetIds),
            statuses: (taxonomy.triggerStatuses || []).filter(s => usedStatuses.has(s.id)),
            analysisTypes: (taxonomy.analysisTypes || []).filter(t => usedTypes.has(t.id))
        };
    }, [triggers, assets, taxonomy, filters]);

    // --- Optimization: Pre-compute Search Context ---
    const triggersWithContext = useMemo(() => {
        if (!Array.isArray(triggers)) return [];

        return triggers.map(t => {
            try {
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

    // --- Filtered Content ---
    const filteredContent = useMemo(() => {
        const searchLower = (filters.searchTerm || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return triggersWithContext.filter(t => {
            const matchesSearch = !filters.searchTerm || t.searchContext.includes(searchLower);

            let matchesYear = true;
            let matchesMonth = true;

            if (t.yearStr) {
                matchesYear = !filters.year || t.yearStr === filters.year;
                matchesMonth = (filters.months || []).length === 0 || (filters.months || []).includes(t.monthStr);
            }

            const matchesStatus = filters.status === 'ALL' || t.status === filters.status;
            const matchesType = filters.analysisType === 'ALL' || t.analysis_type_id === filters.analysisType;

            let matchesAsset = true;
            if (filters.subgroup !== 'ALL') matchesAsset = t.subgroup_id === filters.subgroup;
            else if (filters.equipment !== 'ALL') matchesAsset = t.equipment_id === filters.equipment;
            else if (filters.area !== 'ALL') matchesAsset = t.area_id === filters.area;

            return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesAsset && matchesType;
        });
    }, [triggersWithContext, filters]);

    // --- Sorting ---
    const { sortedItems: filteredTriggers, sortConfig, handleSort } = useSorting(filteredContent, { key: 'start_date', direction: 'desc' });

    return {
        triggers, assets, taxonomy, records,
        addTrigger, updateTrigger, deleteTrigger,
        isModalOpen, setIsModalOpen,
        editingTrigger, setEditingTrigger,
        deleteModalOpen, setDeleteModalOpen,
        triggerToDelete, setTriggerToDelete,
        linkModalOpen, setLinkModalOpen,
        triggerToLink, setTriggerToLink,
        currentPage, setCurrentPage, itemsPerPage,
        showFilters, setShowFilters, filters, setFilters, handleReset, isGlobal, toggleGlobal,
        dynamicOptions,
        filteredTriggers,
        sortConfig, handleSort
    };
};
