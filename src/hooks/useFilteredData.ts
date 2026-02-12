/**
 * Proposta: Hook central de filtragem multidimensional (Cross-Filtering).
 * Fluxo: Implementa a lógica de busca e refino para as três entidades principais (RCAs, Gatilhos e Ações), utilizando critérios memorizados (O(N)) para garantir a performance da interface durante a manipulação de grandes volumes de dados.
 */

import { useMemo } from 'react';
import { useRcaContext } from '../context/RcaContext';
import { FilterState } from '../components/FilterBar';
import { useActionsLogic } from './useActionsLogic';

export const useFilteredData = (filters: FilterState, overrideRecords?: RcaRecord[], overrideAssets?: AssetNode[]) => {
    const { records: contextRecords, triggers, assets: contextAssets } = useRcaContext();
    const { actions } = useActionsLogic();

    const records = overrideRecords || contextRecords;
    const assets = overrideAssets || contextAssets;

    /**
     * Normaliza o termo de busca para comparação insensível a acentos e caixa alta.
     */
    const normalize = (text: string) =>
        text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    const searchLower = normalize(filters.searchTerm);

    // --- FILTRAGEM DE ANÁLISES (RCAs) ---
    const filteredRCAs = useMemo(() => {
        return records.filter(r => {
            // 1. Filtro de Texto (O Que, Quem, Problema, ID)
            if (searchLower) {
                const context = normalize(`${r.what} ${r.facilitator} ${r.problem_description} ${r.id} ${r.os_number}`);
                if (!context.includes(searchLower)) return false;
            }

            // 2. Filtros de Taxonomia e Categorias
            if (filters.status !== 'ALL' && r.status !== filters.status) return false;
            if (filters.analysisType !== 'ALL' && r.analysis_type !== filters.analysisType) return false;
            if (filters.specialty !== 'ALL' && r.specialty_id !== filters.specialty) return false;
            if (filters.failureMode !== 'ALL' && r.failure_mode_id !== filters.failureMode) return false;
            if (filters.failureCategory !== 'ALL' && r.failure_category_id !== filters.failureCategory) return false;
            if (filters.componentType !== 'ALL' && r.component_type !== filters.componentType) return false;

            // 3. Filtro de Causa Raiz (6M)
            if (filters.rootCause6M !== 'ALL') {
                const hasRoot = r.root_causes?.some(rc => rc.root_cause_m_id === filters.rootCause6M);
                if (!hasRoot) return false;
            }

            // 4. Filtro de Localização Técnica (Hierarquia)
            if (filters.area !== 'ALL' && r.area_id !== filters.area) return false;
            if (filters.equipment !== 'ALL' && r.equipment_id !== filters.equipment) return false;
            if (filters.subgroup !== 'ALL' && r.subgroup_id !== filters.subgroup) return false;

            // 5. Filtros Temporais
            if (filters.year && r.failure_date && !r.failure_date.startsWith(filters.year)) return false;
            if (filters.months.length > 0 && r.failure_date) {
                const month = r.failure_date.split('-')[1];
                if (!filters.months.includes(month)) return false;
            }

            return true;
        });
    }, [records, filters, searchLower]);

    // --- FILTRAGEM DE GATILHOS (TRIGGERS) ---
    const filteredTriggers = useMemo(() => {
        return triggers.filter(t => {
            if (searchLower) {
                const context = normalize(`${t.stop_reason} ${t.comments} ${t.responsible} ${t.id}`);
                if (!context.includes(searchLower)) return false;
            }

            if (filters.area !== 'ALL' && t.area_id !== filters.area) return false;
            if (filters.equipment !== 'ALL' && t.equipment_id !== filters.equipment) return false;
            if (filters.subgroup !== 'ALL' && t.subgroup_id !== filters.subgroup) return false;
            if (filters.status !== 'ALL' && t.status !== filters.status) return false;
            if (filters.analysisType !== 'ALL' && t.analysis_type_id !== filters.analysisType) return false;

            if (filters.year && t.start_date && !t.start_date.startsWith(filters.year)) return false;
            if (filters.months.length > 0 && t.start_date) {
                const month = t.start_date.split('-')[1];
                if (!filters.months.includes(month)) return false;
            }

            return true;
        });
    }, [triggers, filters, searchLower]);

    // --- FILTRAGEM DE PLANOS DE AÇÃO ---
    const filteredActions = useMemo(() => {
        return actions.filter(a => {
            if (searchLower && !a.searchContext.includes(searchLower)) return false;

            if (filters.status !== 'ALL' && a.status !== filters.status) return false;
            if (filters.specialty !== 'ALL' && a.specialtyId !== filters.specialty) return false;
            if (filters.area !== 'ALL' && a.areaId !== filters.area) return false;
            if (filters.equipment !== 'ALL' && a.equipmentId !== filters.equipment) return false;
            if (filters.subgroup !== 'ALL' && a.subgroupId !== filters.subgroup) return false;

            if (filters.year && a.yearStr !== filters.year) return false;
            if (filters.months.length > 0 && !filters.months.includes(a.monthStr)) return false;

            return true;
        });
    }, [actions, filters, searchLower]);

    // --- OPÇÕES DISPONÍVEIS (DEPENDENT FILTERS) ---
    const availableOptions = useMemo(() => {
        const options = {
            status: new Set<string>(),
            analysisType: new Set<string>(),
            specialty: new Set<string>(),
            failureMode: new Set<string>(),
            failureCategory: new Set<string>(),
            componentType: new Set<string>(),
            rootCause6M: new Set<string>(),
            area: new Set<string>(),
            equipment: new Set<string>(),
            subgroup: new Set<string>(),
            year: new Set<string>(),
            months: new Set<string>(),
        };

        // O(N): Extração em passo único após a filtragem principal
        filteredRCAs.forEach(r => {
            if (r.status) options.status.add(r.status);
            if (r.analysis_type) options.analysisType.add(r.analysis_type);
            if (r.specialty_id) options.specialty.add(r.specialty_id);
            if (r.failure_mode_id) options.failureMode.add(r.failure_mode_id);
            if (r.failure_category_id) options.failureCategory.add(r.failure_category_id);
            if (r.component_type) options.componentType.add(r.component_type);
            
            if (r.area_id) options.area.add(r.area_id);
            if (r.equipment_id) options.equipment.add(r.equipment_id);
            if (r.subgroup_id) options.subgroup.add(r.subgroup_id);

            if (r.failure_date) {
                const [y, m] = r.failure_date.split('-');
                if (y) options.year.add(y);
                if (m) options.months.add(m);
            }

            r.root_causes?.forEach(rc => {
                if (rc.root_cause_m_id) options.rootCause6M.add(rc.root_cause_m_id);
            });
        });

        return options;
    }, [filteredRCAs]);

    // --- OPÇÕES DISPONÍVEIS PARA GATILHOS (DEPENDENT FILTERS) ---
    const availableTriggerOptions = useMemo(() => {
        const options = {
            status: new Set<string>(),
            analysisType: new Set<string>(),
            specialty: new Set<string>(), // Gatilhos não têm especialidade direta, mas mantemos estrutura
            failureMode: new Set<string>(),
            failureCategory: new Set<string>(),
            componentType: new Set<string>(),
            rootCause6M: new Set<string>(),
            area: new Set<string>(),
            equipment: new Set<string>(),
            subgroup: new Set<string>(),
            year: new Set<string>(),
            months: new Set<string>(),
        };

        filteredTriggers.forEach(t => {
            if (t.status) options.status.add(t.status);
            if (t.analysis_type_id) options.analysisType.add(t.analysis_type_id);
            
            if (t.area_id) options.area.add(t.area_id);
            if (t.equipment_id) options.equipment.add(t.equipment_id);
            if (t.subgroup_id) options.subgroup.add(t.subgroup_id);

            if (t.start_date) {
                const [y, m] = t.start_date.split('-');
                if (y) options.year.add(y);
                if (m) options.months.add(m);
            }
        });

        return options;
    }, [filteredTriggers]);

    return {
        filteredRCAs,
        filteredTriggers,
        filteredActions,
        availableOptions,
        availableTriggerOptions
    };
};