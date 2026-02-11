/**
 * Proposta: Serviço de comunicação com a API REST do RCA System.
 * Fluxo: Centraliza todas as chamadas HTTP para o backend, garantindo tratamento de erros unificado e normalização de payloads.
 */

import { AssetNode, RcaRecord, ActionRecord, TriggerRecord, TaxonomyConfig, MigrationData, TaxonomyItem } from "../types";
import { STATUS_IDS } from "../constants/SystemConstants";

const API_BASE = 'http://localhost:3001/api';

/**
 * Helper para verificar a integridade da resposta HTTP e lançar erros descritivos.
 */
const checkResponse = async (response: Response, operation: string): Promise<any> => {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error(`❌ Erro na API [${operation}]:`, response.status, errorBody);
        const details = errorBody.details
            ? ` (${JSON.stringify(errorBody.details)})`
            : '';
        throw new Error((errorBody.error || `HTTP ${response.status}`) + details);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

// --- GESTÃO DE ATIVOS (ASSETS) ---

export const fetchAssets = async (): Promise<AssetNode[]> => {
    console.log('🔄 API: Buscando árvore de ativos...');
    const response = await fetch(`${API_BASE}/assets`);
    return checkResponse(response, 'GET /assets');
};

export const saveAssetToApi = async (asset: Partial<AssetNode> & { id: string }): Promise<void> => {
    console.log('🔄 API: Salvando ativo:', asset.id);
    const response = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
    });
    await checkResponse(response, 'POST /assets');
};

export const importAssetsToApi = async (assets: any[]): Promise<void> => {
    console.log('🔄 API: Iniciando importação de ativos...', assets.length);

    // Detecta se a lista está em formato plano ou em árvore para decidir a estratégia de importação
    const isAlreadyFlat = assets.some(a => a.parent_id !== undefined && (!a.children || a.children.length === 0));

    let flat: any[] = [];

    if (isAlreadyFlat) {
        console.log('ℹ️ Lista plana detectada. Importando sem transformações.');
        flat = assets.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            parent_id: a.parent_id || null 
        }));
    } else {
        console.log('ℹ️ Árvore de ativos detectada. Realizando achatamento (flattening)...');
        const flatten = (nodes: any[], parentId?: string): any[] => {
            let result: any[] = [];
            for (const n of nodes) {
                result.push({ id: n.id, name: n.name, type: n.type, parent_id: parentId || null });
                if (n.children && n.children.length > 0) {
                    result = [...result, ...flatten(n.children, n.id)];
                }
            }
            return result;
        };
        flat = flatten(assets);
    }

    // Limpa ativos existentes para evitar inconsistências hierárquicas em restaurações completas
    console.log('🧹 API: Limpando ativos existentes antes da importação...');
    try {
        const flatAssets = await fetch(`${API_BASE}/assets/flat`).then(r => r.json());
        for (const asset of flatAssets) {
            await fetch(`${API_BASE}/assets/${asset.id}`, { method: 'DELETE' });
        }
    } catch (e) {
        console.warn('⚠️ API: Falha ao limpar alguns ativos, prosseguindo com a importação...', e);
    }

    const response = await fetch(`${API_BASE}/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flat)
    });
    await checkResponse(response, 'POST /assets/bulk');
};

// --- TAXONOMIA E CONFIGURAÇÕES ---

export const fetchTaxonomy = async (): Promise<TaxonomyConfig> => {
    console.log('🔄 API: Buscando taxonomia e configurações...');
    const response = await fetch(`${API_BASE}/taxonomy`);
    return checkResponse(response, 'GET /taxonomy');
};

export const saveTaxonomyToApi = async (taxonomy: TaxonomyConfig): Promise<void> => {
    console.log('🔄 API: Salvando novas configurações de taxonomia...');
    const response = await fetch(`${API_BASE}/taxonomy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taxonomy)
    });
    await checkResponse(response, 'PUT /taxonomy');
};

export const importTaxonomyToApi = async (taxonomy: TaxonomyConfig): Promise<void> => {
    // Reutiliza o método de salvamento padrão para garantir integridade
    return saveTaxonomyToApi(taxonomy);
};


// --- ANÁLISES (RCAs) ---

export const fetchRecords = async (): Promise<RcaRecord[]> => {
    console.log('🔄 API: Buscando lista resumida de análises...');
    const response = await fetch(`${API_BASE}/rcas`);
    return checkResponse(response, 'GET /rcas');
};

export const fetchAllRecordsFull = async (): Promise<RcaRecord[]> => {
    console.log('🔄 API: Buscando carga completa de análises (Backup)...');
    const response = await fetch(`${API_BASE}/rcas?full=true`);
    return checkResponse(response, 'GET /rcas?full=true');
};

export const fetchRecordById = async (id: string): Promise<RcaRecord | null> => {
    try {
        const response = await fetch(`${API_BASE}/rcas/${id}`);
        if (response.status === 404) return null;
        return await checkResponse(response, `GET /rcas/${id}`);
    } catch {
        return null;
    }
};

export const saveRecordToApi = async (record: RcaRecord, isUpdate?: boolean): Promise<void> => {
    console.log('🔄 API: Persistindo análise:', record.id);

    // Se o chamador explicitamente disse que é um update ou criação, respeitamos para evitar 404 no console
    if (isUpdate === true) {
        const response = await fetch(`${API_BASE}/rcas/${record.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        await checkResponse(response, `PUT /rcas/${record.id}`);
        return;
    }

    if (isUpdate === false) {
        const response = await fetch(`${API_BASE}/rcas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        await checkResponse(response, 'POST /rcas');
        return;
    }

    // Modo Automático (Fallback): Tenta atualizar primeiro (otimista)
    try {
        const response = await fetch(`${API_BASE}/rcas/${record.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });

        if (response.ok) {
            await checkResponse(response, `PUT /rcas/${record.id}`);
            return;
        }
        
        if (response.status === 404) {
            const createResponse = await fetch(`${API_BASE}/rcas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });
            await checkResponse(createResponse, 'POST /rcas');
            return;
        }

        await checkResponse(response, `PUT /rcas/${record.id}`);
    } catch (error) {
        throw error;
    }
};

export const deleteRecordFromApi = async (id: string): Promise<void> => {
    console.log('🔄 API: Excluindo análise:', id);
    const response = await fetch(`${API_BASE}/rcas/${id}`, { method: 'DELETE' });
    await checkResponse(response, `DELETE /rcas/${id}`);
    console.log('✅ API: Análise excluída com sucesso:', id);
};

export const importRecordsToApi = async (records: RcaRecord[]): Promise<void> => {
    console.log('🔄 API: Importando análises com contexto de planos de ação...', records.length);
    
    // Busca ações atuais para fornecer contexto ao motor de status automático do backend
    const currentActions = await fetchActions();

    const response = await fetch(`${API_BASE}/rcas/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            records: records,
            actions: currentActions
        })
    });
    await checkResponse(response, 'POST /rcas/bulk (Importação CSV)');
};

// --- PLANOS DE AÇÃO (CAPA) ---

export const fetchActions = async (): Promise<ActionRecord[]> => {
    console.log('🔄 API: Buscando lista de planos de ação...');
    const response = await fetch(`${API_BASE}/actions`);
    return checkResponse(response, 'GET /actions');
};

export const fetchActionsByRca = async (rcaId: string): Promise<ActionRecord[]> => {
    const response = await fetch(`${API_BASE}/actions?rca_id=${rcaId}`);
    return checkResponse(response, `GET /actions?rca_id=${rcaId}`);
};

export const saveActionToApi = async (action: ActionRecord, isUpdate?: boolean): Promise<void> => {
    console.log('🔄 API: Persistindo plano de ação:', action.id);

    if (isUpdate === true) {
        const response = await fetch(`${API_BASE}/actions/${action.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        await checkResponse(response, `PUT /actions/${action.id}`);
        return;
    }

    if (isUpdate === false) {
        const response = await fetch(`${API_BASE}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        await checkResponse(response, 'POST /actions');
        return;
    }

    const checkResponse_local = await fetch(`${API_BASE}/actions/${action.id}`);

    if (checkResponse_local.ok) {
        const response = await fetch(`${API_BASE}/actions/${action.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        await checkResponse(response, `PUT /actions/${action.id}`);
    } else {
        const response = await fetch(`${API_BASE}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        await checkResponse(response, 'POST /actions');
    }
};

export const deleteActionFromApi = async (id: string): Promise<void> => {
    console.log('🔄 API: Excluindo plano de ação:', id);
    const response = await fetch(`${API_BASE}/actions/${id}`, { method: 'DELETE' });
    await checkResponse(response, `DELETE /actions/${id}`);
};

export const importActionsToApi = async (actions: ActionRecord[]): Promise<void> => {
    console.log('🔄 API: Importando lote de planos de ação...', actions.length);
    const response = await fetch(`${API_BASE}/actions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actions)
    });
    await checkResponse(response, 'POST /actions/bulk');
};


// --- GATILHOS (TRIGGERS) ---

export const fetchTriggers = async (): Promise<TriggerRecord[]> => {
    console.log('🔄 API: Buscando lista de gatilhos...');
    const response = await fetch(`${API_BASE}/triggers`);
    return checkResponse(response, 'GET /triggers');
};

export const saveTriggerToApi = async (trigger: TriggerRecord, isUpdate?: boolean): Promise<void> => {
    console.log('🔄 API: Persistindo gatilho:', trigger.id);

    if (isUpdate === true) {
        const response = await fetch(`${API_BASE}/triggers/${trigger.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trigger)
        });
        await checkResponse(response, `PUT /triggers/${trigger.id}`);
        return;
    }

    if (isUpdate === false) {
        const response = await fetch(`${API_BASE}/triggers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trigger)
        });
        await checkResponse(response, 'POST /triggers');
        return;
    }

    // Tenta atualizar primeiro se tiver ID (abordagem padrão para updates)
    if (trigger.id) {
        try {
            const checkRes = await fetch(`${API_BASE}/triggers/${trigger.id}`);
            if (checkRes.ok) {
                console.log('🔄 API: Registro existente encontrado. Atualizando (PUT)...');
                const updateResponse = await fetch(`${API_BASE}/triggers/${trigger.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(trigger)
                });
                await checkResponse(updateResponse, `PUT /triggers/${trigger.id}`);
                return;
            }
        } catch (e) {
            console.warn('⚠️ API: Falha ao verificar existência do gatilho, tentando POST...');
        }
    }

    // Se não existir ou não tiver ID, tenta criar (POST)
    const response = await fetch(`${API_BASE}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trigger)
    });
    await checkResponse(response, 'POST /triggers');
};

export const deleteTriggerFromApi = async (id: string): Promise<void> => {
    console.log('🔄 API: Excluindo gatilho:', id);
    const response = await fetch(`${API_BASE}/triggers/${id}`, { method: 'DELETE' });
    await checkResponse(response, `DELETE /triggers/${id}`);
};

export const importTriggersToApi = async (triggers: TriggerRecord[]): Promise<void> => {
    console.log('🔄 API: Importando lote de gatilhos...', triggers.length);
    const response = await fetch(`${API_BASE}/triggers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(triggers)
    });
    await checkResponse(response, 'POST /triggers/bulk');
};


// --- UTILITÁRIOS INTERNOS ---

const generateId = (prefix: string = 'GEN'): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
};

/**
 * Recupera ativos a partir de registros de análise (fallback para dados orfãos).
 */
const extractAssetsFromRecords = (records: any[]): any[] => {
    const assetsMap = new Map<string, any>();

    const addAsset = (id: string, name: string, type: 'AREA' | 'EQUIPMENT' | 'SUBGROUP', parentId: string | null) => {
        if (!id || assetsMap.has(id)) return;
        assetsMap.set(id, {
            id,
            name: name || id,
            type,
            parent_id: parentId
        });
    };

    records.forEach(r => {
        if (r.area_id) addAsset(r.area_id, r.area_id, 'AREA', null);
        if (r.equipment_id && r.area_id) addAsset(r.equipment_id, r.equipment_id, 'EQUIPMENT', r.area_id);
        if (r.subgroup_id && r.equipment_id) addAsset(r.subgroup_id, r.subgroup_id, 'SUBGROUP', r.equipment_id);
    });

    console.log(`ℹ️ Ativos extraídos automaticamente: ${assetsMap.size}`);
    return Array.from(assetsMap.values());
};

const deleteAllRecords = async () => {
    const rcas = await fetchRecords();
    const ids = rcas.map(r => r.id);
    if (ids.length === 0) return;

    console.log(`🧹 Limpando ${ids.length} análises via exclusão em massa...`);
    const response = await fetch(`${API_BASE}/rcas/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    await checkResponse(response, 'POST /rcas/bulk-delete');
};

const deleteAllActions = async () => {
    const acts = await fetchActions();
    const ids = acts.map(a => a.id);
    if (ids.length === 0) return;

    console.log(`🧹 Limpando ${ids.length} ações via exclusão em massa...`);
    const response = await fetch(`${API_BASE}/actions/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    await checkResponse(response, 'POST /actions/bulk-delete');
};

const deleteAllTriggers = async () => {
    const trigs = await fetchTriggers();
    const ids = trigs.map(t => t.id);
    if (ids.length === 0) return;

    console.log(`🧹 Limpando ${ids.length} gatilhos via exclusão em massa...`);
    const response = await fetch(`${API_BASE}/triggers/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    await checkResponse(response, 'POST /triggers/bulk-delete');
};

/**
 * Executa a orquestração de importação total de dados para o servidor.
 */
export const importDataToApi = async (data: any, mode: 'APPEND' | 'UPDATE' | 'REPLACE' = 'REPLACE', taxonomyFilters?: string[]): Promise<{ success: boolean, message: string }> => {
    console.log(`🔄 API: Iniciando importação em massa [Modo: ${mode}]...`, {
        análises: data.records?.length || 0,
        filtros: taxonomyFilters
    });

    try {
        // 0. FASE DE LIMPEZA (Modo Substituição)
        if (mode === 'REPLACE') {
            console.log('⚠️ MODO SUBSTITUIÇÃO: Eliminando dados existentes...');
            await Promise.all([deleteAllActions(), deleteAllTriggers()]);
            await deleteAllRecords();
        }

        // 1. GESTÃO DE ATIVOS
        let assetsToImport = data.assets;

        if (!assetsToImport || assetsToImport.length === 0) {
            const rcas = data.records || data.results || [];
            if (rcas.length > 0) {
                console.log('⚠️ JSON sem ativos explícitos. Tentando extração a partir das análises...');
                assetsToImport = extractAssetsFromRecords(rcas);
            }
        }

        if (assetsToImport && assetsToImport.length > 0) {
            await importAssetsToApi(assetsToImport);
            console.log('✅ Ativos processados:', assetsToImport.length);
        }

        // 2. GESTÃO DE TAXONOMIA
        const currentTaxonomy = await fetchTaxonomy();
        const incomingTaxonomy = data.taxonomy || {};
        let taxonomyToSave: TaxonomyConfig = { ...currentTaxonomy };

        const keysToProcess = taxonomyFilters && taxonomyFilters.length > 0
            ? taxonomyFilters
            : Object.keys(incomingTaxonomy);

        keysToProcess.forEach((key: string) => {
            if (key in incomingTaxonomy) {
                // @ts-ignore
                taxonomyToSave[key as keyof TaxonomyConfig] = incomingTaxonomy[key];
            }
        });

        const ensureTaxonomy = (listKey: keyof TaxonomyConfig, val: string) => {
            if (!val) return null;
            const list = (taxonomyToSave[listKey] as TaxonomyItem[]) || [];
            const existing = list.find(i => i.id === val || i.name.toLowerCase() === val.toLowerCase());
            if (existing) return existing.id;
            const newId = val.length < 15 ? val : generateId('AUTO');
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
            console.log('➕ MODO ANEXAR: Gerando novos IDs (preservando UUIDs)...');
            const shouldPreserve = (id: string, type: string) => {
                return id && id.length > 30 && !id.startsWith(type + '-');
            };

            rcasToImportRaw.forEach((r: any) => {
                idMap.set(r.id, shouldPreserve(r.id, 'RCA') ? r.id : generateId('RCA'));
            });
            actionsToImportRaw.forEach((a: any) => {
                idMap.set(a.id, shouldPreserve(a.id, 'ACT') ? a.id : generateId('ACT'));
            });
            triggersToImportRaw.forEach((t: any) => {
                idMap.set(t.id, shouldPreserve(t.id, 'TRG') ? t.id : generateId('TRG'));
            });
        }

        const resolveId = (oldId: string, type: 'RCA' | 'ACT' | 'TRG') => {
            if (oldId && oldId.length > 30 && !oldId.startsWith('RCA-') && !oldId.startsWith('TRG-') && !oldId.startsWith('ACT-')) {
                return oldId;
            }
            if (mode !== 'APPEND') return oldId;
            return idMap.get(oldId) || generateId(type);
        };

        const resolveRef = (refId: string) => {
            if (mode !== 'APPEND') return refId;
            return idMap.get(refId) || refId;
        };

        const rcaActionsMap = new Map<string, any[]>();
        actionsToImportRaw.forEach((a: any) => {
            if (a.rca_id) {
                const targetRcaId = resolveRef(a.rca_id);
                const list = rcaActionsMap.get(targetRcaId) || [];
                list.push({ ...a, status: String(a.status) });
                rcaActionsMap.set(targetRcaId, list);
            }
        });

        const discoveredRelations = new Map<string, Set<string>>();

        const normalizedRcas = rcasToImportRaw.map((rec: any) => {
            const newRec = { ...rec };
            newRec.id = resolveId(rec.id, 'RCA');

            // Lógica de pré-validação de status para a importação
            const mandatoryStrings = [
                newRec.analysis_type, newRec.what, newRec.problem_description, newRec.subgroup_id,
                newRec.who, newRec.when, newRec.where_description, newRec.specialty_id,
                newRec.failure_mode_id, newRec.failure_category_id, newRec.component_type
            ];
            const stringsOk = mandatoryStrings.every(s => s && String(s).trim().length > 0);

            const checkArrayImport = (val: any) => {
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
            const isOpenStatus = !currentStatus || currentStatus === STATUS_IDS.IN_PROGRESS || currentStatus === 'Em Andamento';

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
                newRec.root_causes.forEach((rc: any) => {
                    if (rc.root_cause_m_id) {
                        rc.root_cause_m_id = ensureTaxonomy('rootCauseMs', rc.root_cause_m_id) || rc.root_cause_m_id;
                    }
                });
            }

            return newRec;
        });

        await saveTaxonomyToApi(taxonomyToSave);
        console.log('✅ Taxonomia atualizada.');

        // 3. EXECUÇÃO DA PERSISTÊNCIA (Lote Consolidado)
        const preparedActions = actionsToImportRaw.map((a: any) => ({
            ...a,
            id: resolveId(a.id, 'ACT'),
            rca_id: resolveRef(a.rca_id)
        }));

        if (normalizedRcas.length > 0) {
            console.log('🔄 Importando lote de análises com contexto...');
            const response = await fetch(`${API_BASE}/rcas/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records: normalizedRcas, actions: preparedActions })
            });
            await checkResponse(response, 'POST /rcas/bulk');
        }

        if (preparedActions.length > 0) {
            console.log('🔄 Persistindo lote de planos de ação...');
            const response = await fetch(`${API_BASE}/actions/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preparedActions)
            });
            await checkResponse(response, 'POST /actions/bulk');
        }

        return {
            success: true,
            message: `Importação (${mode}) concluída com sucesso.`
        };
    } catch (error) {
        console.error('❌ Falha crítica na importação:', error);
        return { success: false, message: `Falha na importação: ${error}` };
    }
};