import { useMemo } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { FilterState } from '../components/FilterBar';
import { RcaRecord, ActionRecord, AssetNode } from '../types';

export interface ActionViewModel extends ActionRecord {
    rcaTitle: string;
    assetName: string;
    areaId: string;
    equipmentId: string;
    subgroupId: string;
    categoryId: string;
    specialtyId: string;
}

/**
 * Hook para processar filtros inteligentes e cruzados entre RCAs, Ações e Gatilhos.
 */
export const useFilteredData = (filters: FilterState) => {
    const { records, actions, triggers, assets, taxonomy } = useRcaContext();

    const normalize = (s: string) => s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

    // 1. Otimização: Pre-calcula índices de busca para RCAs e Ações (Apenas quando os dados mudam)
    const indexedRCAs = useMemo(() => {
        return records.map(r => ({
            ...r,
            _searchIndex: normalize(`${r.id} ${r.what} ${r.problem_description} ${r.who} ${r.os_number}`),
            _year: r.failure_date ? new Date(r.failure_date).getFullYear().toString() : '',
            _month: r.failure_date ? (new Date(r.failure_date).getMonth() + 1).toString().padStart(2, '0') : ''
        }));
    }, [records]);

    const actionsByRcaMap = useMemo(() => {
        const map = new Map<string, (ActionRecord & { _searchIndex: string })[]>();
        actions.forEach(a => {
            const indexedAction = { ...a, _searchIndex: normalize(`${a.action} ${a.responsible}`) };
            const list = map.get(a.rca_id) || [];
            list.push(indexedAction);
            map.set(a.rca_id, list);
        });
        return map;
    }, [actions]);

    const findAssetName = (id: string, nodes: AssetNode[]): string => {
        for (const n of nodes) {
            if (n.id === id) return n.name;
            if (n.children) {
                const found = findAssetName(id, n.children);
                if (found) return found;
            }
        }
        return id;
    };

    // 2. Processamento de RCAs (Agora com busca O(1) em strings pré-normalizadas)
    const filteredRCAs = useMemo(() => {
        const searchTerm = normalize(filters.searchTerm);
        const hasSearch = !!searchTerm;
        const statusFilter = filters.status;
        const isActionStatus = ['1', '2', '3', '4'].includes(statusFilter);
        const isTriggerStatus = statusFilter.startsWith('T-STATUS');

        return indexedRCAs.filter(r => {
            // A) Filtros de Ativos
            if (filters.subgroup !== 'ALL' && r.subgroup_id !== filters.subgroup) return false;
            if (filters.equipment !== 'ALL' && r.equipment_id !== filters.equipment) return false;
            if (filters.area !== 'ALL' && r.area_id !== filters.area) return false;

            // B) Filtros de Data (Pré-calculados)
            if (filters.year && r._year !== filters.year) return false;
            if (filters.months.length > 0 && !filters.months.includes(r._month)) return false;

            // C) Busca Textual Inteligente (Sem normalização no loop!)
            if (hasSearch) {
                const rActions = actionsByRcaMap.get(r.id) || [];
                const aContentMatch = rActions.some(a => a._searchIndex.includes(searchTerm));
                
                if (!r._searchIndex.includes(searchTerm) && !aContentMatch) return false;
            }

            // D) Filtro de Status Inteligente
            if (statusFilter !== 'ALL') {
                if (isActionStatus) {
                    const rActions = actionsByRcaMap.get(r.id) || [];
                    if (!rActions.some(a => a.status === statusFilter)) return false;
                } else if (isTriggerStatus) {
                    const linkedTrigger = triggers.find(trig => trig.rca_id === r.id && trig.status === statusFilter);
                    if (!linkedTrigger) return false;
                } else {
                    if (r.status !== statusFilter) return false;
                }
            }

            // E) Filtros Técnicos
            if (filters.specialty !== 'ALL' && r.specialty_id !== filters.specialty) return false;
            if (filters.analysisType !== 'ALL' && r.analysis_type !== filters.analysisType) return false;
            if (filters.failureMode !== 'ALL' && r.failure_mode_id !== filters.failureMode) return false;
            if (filters.failureCategory !== 'ALL' && r.failure_category_id !== filters.failureCategory) return false;
            if (filters.componentType !== 'ALL' && r.component_type !== filters.componentType) return false;
            if (filters.rootCause6M !== 'ALL' && !r.root_causes?.some(rc => rc.root_cause_m_id === filters.rootCause6M)) return false;

            return true;
        });
    }, [indexedRCAs, actionsByRcaMap, triggers, filters, taxonomy]);

    // 2. Processamento de Ações (com conversão para ViewModel)
    const filteredActions = useMemo(() => {
        const parentRcaMap = new Map<string, RcaRecord>(filteredRCAs.map(r => [r.id, r]));

        return actions
            .filter(a => {
                const parent = parentRcaMap.get(a.rca_id);
                if (!parent) return false;

                const isActionStatus = ['1', '2', '3', '4'].includes(filters.status);
                if (isActionStatus && a.status !== filters.status) return false;

                return true;
            })
            .map(a => {
                const rca = parentRcaMap.get(a.rca_id)!;
                return {
                    ...a,
                    rcaTitle: rca.what || rca.id,
                    assetName: rca.asset_name_display || findAssetName(rca.subgroup_id || rca.equipment_id || rca.area_id, assets),
                    areaId: rca.area_id || '',
                    equipmentId: rca.equipment_id || '',
                    subgroupId: rca.subgroup_id || '',
                    categoryId: rca.failure_category_id || '',
                    specialtyId: rca.specialty_id || ''
                } as ActionViewModel;
            });
    }, [actions, filteredRCAs, filters.status, assets]);

    // 3. Processamento de Gatilhos
    const filteredTriggers = useMemo(() => {
        return triggers.filter(t => {
            // Ativos
            if (filters.subgroup !== 'ALL' && t.subgroup_id !== filters.subgroup) return false;
            if (filters.equipment !== 'ALL' && t.equipment_id !== filters.equipment) return false;
            if (filters.area !== 'ALL' && t.area_id !== filters.area) return false;

            // Data
            const tDate = new Date(t.start_date);
            const tYear = tDate.getFullYear().toString();
            const tMonth = (tDate.getMonth() + 1).toString().padStart(2, '0');
            if (filters.year && tYear !== filters.year) return false;
            if (filters.months.length > 0 && !filters.months.includes(tMonth)) return false;

            // Busca
            if (filters.searchTerm) {
                const term = normalize(filters.searchTerm);
                const tContent = normalize(`${t.id} ${t.stop_reason} ${t.responsible} ${t.stop_type}`);
                if (!tContent.includes(term)) return false;
            }

            // Status (Cruzado com RCA se houver link)
            if (filters.status !== 'ALL') {
                if (t.rca_id) {
                    // Se tem RCA, ela deve estar no set filtrado
                    if (!filteredRCAs.some(r => r.id === t.rca_id)) return false;
                } else {
                    const isTriggerStatus = filters.status.startsWith('T-STATUS');
                    if (isTriggerStatus) {
                        if (t.status !== filters.status) return false;
                    } else {
                        // Se filtrar por status de RCA/Ação, oculta gatilhos órfãos
                        return false; 
                    }
                }
            }

            return true;
        });
    }, [triggers, filteredRCAs, filters]);

    return {
        filteredRCAs,
        filteredActions,
        filteredTriggers
    };
};
