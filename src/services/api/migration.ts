
/**
 * Proposta: Serviço de API para orquestração de migração e importação de dados.
 * Fluxo: Implementa a lógica complexa de importação integral (JSON), incluindo extração de ativos de registros, limpeza de dados existentes no modo substituição e normalização de status/taxonomia.
 */

import { TaxonomyConfig, TaxonomyItem } from "../../types";
import { STATUS_IDS } from "../../constants/SystemConstants";
import { API_BASE, checkResponse, generateId, TAXONOMY_PREFIXES, isStandardId } from "./base";
import { importAssetsToApi } from "./assets";
import { fetchTaxonomy, saveTaxonomyToApi } from "./taxonomy";
import { fetchRecords } from "./rcas";
import { fetchActions } from "./actions";
import { fetchTriggers } from "./triggers";
import { logger } from "../../utils/logger";
import { RcaRecord, ActionRecord, TriggerRecord, AssetNode } from "../../types";

/**
 * Recupera ativos a partir de registros de análise (fallback para dados orfãos).
 */
const extractAssetsFromRecords = (records: RcaRecord[]): Omit<AssetNode, 'children'>[] => {
    const assetsMap = new Map<string, Omit<AssetNode, 'children'>>();

    const addAsset = (id: string, name: string, type: 'AREA' | 'EQUIPMENT' | 'SUBGROUP', parentId: string | null) => {
        if (!id || assetsMap.has(id)) return;
        assetsMap.set(id, {
            id,
            name: name || id,
            type,
            parentId: parentId || undefined
        });
    };

    records.forEach(r => {
        if (r.area_id) addAsset(r.area_id, r.area_id, 'AREA', null);
        if (r.equipment_id && r.area_id) addAsset(r.equipment_id, r.equipment_id, 'EQUIPMENT', r.area_id);
        if (r.subgroup_id && r.equipment_id) addAsset(r.subgroup_id, r.subgroup_id, 'SUBGROUP', r.equipment_id);
    });

    logger.info(`API: Ativos extraídos automaticamente: ${assetsMap.size}`);
    return Array.from(assetsMap.values());
};

const deleteAllRecords = async () => {
    const rcas = await fetchRecords();
    const ids = rcas.map(r => r.id);
    if (ids.length === 0) return;

    logger.info(`API: Limpando ${ids.length} análises via exclusão em massa...`);
    const response = await fetch(`${API_BASE}/rcas/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    await checkResponse<void>(response, 'POST /rcas/bulk-delete');
};

const deleteAllActions = async () => {
    const acts = await fetchActions();
    const ids = acts.map(a => a.id);
    if (ids.length === 0) return;

    logger.info(`API: Limpando ${ids.length} ações via exclusão em massa...`);
    const response = await fetch(`${API_BASE}/actions/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    await checkResponse<void>(response, 'POST /actions/bulk-delete');
};

const deleteAllTriggers = async () => {
    const trigs = await fetchTriggers();
    const ids = trigs.map(t => t.id);
    if (ids.length === 0) return;

    logger.info(`API: Limpando ${ids.length} gatilhos via exclusão em massa...`);
    const response = await fetch(`${API_BASE}/triggers/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    await checkResponse<void>(response, 'POST /triggers/bulk-delete');
};

/**
 * Executa a orquestração de importação total de dados para o servidor.
 */
export const importDataToApi = async (data: Partial<{ records: RcaRecord[], results: RcaRecord[], assets: AssetNode[], taxonomy: TaxonomyConfig, actions: ActionRecord[], triggers: TriggerRecord[] }>, mode: 'APPEND' | 'UPDATE' | 'REPLACE' = 'REPLACE', taxonomyFilters?: string[]): Promise<{ success: boolean, message: string }> => {
    logger.info(`API: Iniciando importação em massa [Modo: ${mode}]...`, {
        análises: data.records?.length || data.results?.length || 0,
        filtros: taxonomyFilters
    });

    try {
        // 0. FASE DE LIMPEZA (Modo Substituição)
        if (mode === 'REPLACE') {
            logger.info('API: MODO SUBSTITUIÇÃO - Eliminando dados existentes...');
            await Promise.all([deleteAllActions(), deleteAllTriggers()]);
            await deleteAllRecords();
        }

        // 1. GESTÃO DE ATIVOS
        let assetsToImport = data.assets;

        if (!assetsToImport || assetsToImport.length === 0) {
            const rcas = data.records || data.results || [];
            if (rcas.length > 0) {
                logger.info('API: JSON sem ativos explícitos. Tentando extração a partir das análises...');
                assetsToImport = extractAssetsFromRecords(rcas);
            }
        }

        if (assetsToImport && assetsToImport.length > 0) {
            await importAssetsToApi(assetsToImport);
            logger.info('API: Ativos processados:', assetsToImport.length);
        }

        // 2. GESTÃO DE TAXONOMIA (Com Auto-Correção de IDs)
        const currentTaxonomy = await fetchTaxonomy();
        const incomingTaxonomy = data.taxonomy || {};
        let taxonomyToSave: TaxonomyConfig = { ...currentTaxonomy };

        const taxonomyIdMap = new Map<string, string>(); // Mapeamento oldId -> newId

        const keysToProcess = taxonomyFilters && taxonomyFilters.length > 0
            ? taxonomyFilters
            : Object.keys(incomingTaxonomy);

        keysToProcess.forEach((key: string) => {
            const incomingValue = incomingTaxonomy[key as keyof TaxonomyConfig];
            if (incomingValue && Array.isArray(incomingValue)) {
                const prefix = TAXONOMY_PREFIXES[key as keyof typeof TAXONOMY_PREFIXES] || 'TAX';
                const items = (incomingValue as TaxonomyItem[]).map(item => {
                    const newItem = { ...item };
                    // Se o ID não for padrão, geramos um novo e mapeamos
                    if (!isStandardId(item.id, prefix)) {
                        const newId = generateId(prefix);
                        taxonomyIdMap.set(`${key}:${item.id}`, newId);
                        if (item.name && typeof item.name === 'string') {
                            taxonomyIdMap.set(`${key}:${item.name.toLowerCase()}`, newId);
                        }
                        newItem.id = newId;
                        logger.info(`MIG: Corrigindo ID de taxonomia [${key}]: ${item.id} -> ${newId}`);
                    }
                    return newItem;
                });
                // @ts-ignore
                taxonomyToSave[key as keyof TaxonomyConfig] = items;
            } else if (key === 'mandatoryFields' && incomingValue) {
                // @ts-ignore
                taxonomyToSave.mandatoryFields = incomingValue;
            }
        });

        const ensureTaxonomy = (listKey: keyof TaxonomyConfig, val: any) => {
            if (!val) return null;
            const valStr = String(val);
            const valLower = valStr.toLowerCase();
            
            // Verifica o mapa de correção primeiro
            const mappedId = taxonomyIdMap.get(`${listKey}:${valStr}`) || taxonomyIdMap.get(`${listKey}:${valLower}`);
            if (mappedId) return mappedId;

            const list = (taxonomyToSave[listKey] as TaxonomyItem[]) || [];
            const existing = list.find(i => i.id === valStr || (i.name && typeof i.name === 'string' && i.name.toLowerCase() === valLower));
            
            if (existing) {
                const prefix = TAXONOMY_PREFIXES[listKey as keyof typeof TAXONOMY_PREFIXES] || 'TAX';
                // Se o ID encontrado não for padrão, corrigimos on-the-fly
                if (!isStandardId(existing.id, prefix)) {
                    const newId = generateId(prefix);
                    taxonomyIdMap.set(`${listKey}:${existing.id}`, newId);
                    existing.id = newId;
                    return newId;
                }
                return existing.id;
            }

            // Se não existe, cria um novo padrão
            const prefix = TAXONOMY_PREFIXES[listKey as keyof typeof TAXONOMY_PREFIXES] || 'AUTO';
            const newId = generateId(prefix);
            // @ts-ignore
            taxonomyToSave[listKey] = [...list, { id: newId, name: val }];
            return newId;
        };

        // 2.1 PROCESSAMENTO DE REGISTROS (Normalização e Re-mapeamento de IDs)
        const rcasToImportRaw = data.records || data.results || [];
        const actionsToImportRaw = data.actions || [];
        const triggersToImportRaw = data.triggers || [];

        const idMap = new Map<string, string>();

        if (mode === 'APPEND') {
            logger.info('API: MODO ANEXAR - Gerando novos IDs (ignorando originais para evitar update)...');
            // No modo APPEND, forçamos a geração de novos IDs para tudo, garantindo inserção como novos registros
            rcasToImportRaw.forEach((r: RcaRecord) => {
                if (r.id) idMap.set(r.id, generateId('RCA'));
            });
            actionsToImportRaw.forEach((a: ActionRecord) => {
                if (a.id) idMap.set(a.id, generateId('ACT'));
            });
            triggersToImportRaw.forEach((t: TriggerRecord) => {
                if (t.id) idMap.set(t.id, generateId('TRG'));
            });
        }

        const resolveId = (oldId: string, type: 'RCA' | 'ACT' | 'TRG') => {
            if (mode !== 'APPEND') return oldId;
            // Se estamos no modo APPEND, preferimos o ID gerado no mapa. Se não existir, geramos um agora.
            return idMap.get(oldId) || generateId(type);
        };

        const resolveRef = (refId: string) => {
            if (mode !== 'APPEND') return refId;
            return idMap.get(refId) || refId;
        };

        const rcaActionsMap = new Map<string, ActionRecord[]>();
        actionsToImportRaw.forEach((a: ActionRecord) => {
            if (a.rca_id) {
                const targetRcaId = resolveRef(a.rca_id);
                const list = rcaActionsMap.get(targetRcaId) || [];
                list.push({ ...a, status: String(a.status) as any });
                rcaActionsMap.set(targetRcaId, list);
            }
        });

        const normalizedRcas = rcasToImportRaw.map((rec: RcaRecord) => {
            const newRec = { ...rec };
            newRec.id = resolveId(rec.id, 'RCA');

            // Lógica de pré-validação de status para a importação
            const mandatoryStrings = [
                newRec.analysis_type, newRec.what, newRec.problem_description, newRec.subgroup_id,
                newRec.who, newRec.when, newRec.where_description, newRec.specialty_id,
                newRec.failure_mode_id, newRec.failure_category_id, newRec.component_type
            ];
            const stringsOk = mandatoryStrings.every(s => s && String(s).trim().length > 0);

            const checkArrayImport = (val: unknown) => {
                if (Array.isArray(val)) return val.length > 0;
                if (typeof val === 'string' && val.trim().length > 0) {
                    try { const parsed = JSON.parse(val); return Array.isArray(parsed) && parsed.length > 0; } catch { return false; }
                }
                return false;
            };
            const participantsOk = checkArrayImport(newRec.participants);
            const rootCausesOk = checkArrayImport(newRec.root_causes);
            const isMandatoryComplete = stringsOk && participantsOk && rootCausesOk && (newRec.downtime_minutes !== undefined);

            const mainActions = rcaActionsMap.get(newRec.id) || [];
            const hasMainActions = mainActions.length > 0;
            const allActionsEffective = hasMainActions && mainActions.every(a => ['3', '4'].includes(String(a.status)));

            let currentStatus = ensureTaxonomy('analysisStatuses', newRec.status) || newRec.status;
            // Reconhece status aberto tanto por ID técnico quanto por nome legado
            const isOpenStatus = !currentStatus || 
                                 currentStatus === STATUS_IDS.IN_PROGRESS || 
                                 newRec.status === 'Em Andamento';

            if (isOpenStatus) {
                if (!isMandatoryComplete) {
                    newRec.status = STATUS_IDS.IN_PROGRESS;
                } else {
                    newRec.status = (!hasMainActions || allActionsEffective) ? STATUS_IDS.CONCLUDED : STATUS_IDS.WAITING_VERIFICATION;
                }
            } else {
                newRec.status = currentStatus;
            }

            // Normalização de chaves de taxonomia
            if (newRec.specialty_id) newRec.specialty_id = ensureTaxonomy('specialties', newRec.specialty_id) || newRec.specialty_id;
            if (newRec.failure_mode_id) newRec.failure_mode_id = ensureTaxonomy('failureModes', newRec.failure_mode_id) || newRec.failure_mode_id;
            if (newRec.failure_category_id) newRec.failure_category_id = ensureTaxonomy('failureCategories', newRec.failure_category_id) || newRec.failure_category_id;
            if (newRec.component_type) newRec.component_type = ensureTaxonomy('componentTypes', newRec.component_type) || newRec.component_type;
            if (newRec.analysis_type) newRec.analysis_type = ensureTaxonomy('analysisTypes', newRec.analysis_type) || newRec.analysis_type;

            if (newRec.root_causes && Array.isArray(newRec.root_causes)) {
                newRec.root_causes.forEach((rc) => {
                    if (rc.root_cause_m_id) {
                        rc.root_cause_m_id = ensureTaxonomy('rootCauseMs', rc.root_cause_m_id) || rc.root_cause_m_id;
                    }
                });
            }

            return newRec;
        });

        await saveTaxonomyToApi(taxonomyToSave);
        logger.info('API: Taxonomia atualizada.');

        // 3. EXECUÇÃO DA PERSISTÊNCIA (Lote Consolidado)
        const preparedActions = actionsToImportRaw.map((a: ActionRecord) => ({
            ...a,
            id: resolveId(a.id, 'ACT'),
            rca_id: resolveRef(a.rca_id)
        }));

        if (normalizedRcas.length > 0) {
            logger.info('API: Importando lote de análises com contexto...');
            const response = await fetch(`${API_BASE}/rcas/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records: normalizedRcas, actions: preparedActions })
            });
            await checkResponse<void>(response, 'POST /rcas/bulk');
        }

        if (preparedActions.length > 0) {
            logger.info('API: Persistindo lote de planos de ação...');
            const response = await fetch(`${API_BASE}/actions/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preparedActions)
            });
            await checkResponse<void>(response, 'POST /actions/bulk');
        }

        return {
            success: true,
            message: `Importação (${mode}) concluída com sucesso.`
        };
    } catch (error) {
        logger.error('API Error: Falha crítica na importação:', error);
        return { success: false, message: `Falha na importação: ${error}` };
    }
};

