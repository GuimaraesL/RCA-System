// Serviço de comunicação com a API REST
// VERSÃO CORRIGIDA - com verificação de erros em todas as operações

import { AssetNode, RcaRecord, ActionRecord, TriggerRecord, TaxonomyConfig, MigrationData, TaxonomyItem } from "../types";

const API_BASE = 'http://localhost:3001/api';

// --- HELPER: Verificar resposta e lançar erro se falhou ---
const checkResponse = async (response: Response, operation: string): Promise<any> => {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error(`❌ API Error [${operation}]:`, response.status, errorBody);
        throw new Error(errorBody.error || `HTTP ${response.status}`);
    }
    // Algumas operações retornam 204 No Content
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

// --- ASSETS ---
export const fetchAssets = async (): Promise<AssetNode[]> => {
    console.log('🔄 API: Fetching assets...');
    const response = await fetch(`${API_BASE}/assets`);
    return checkResponse(response, 'GET /assets');
};

export const saveAssetToApi = async (asset: Partial<AssetNode> & { id: string }): Promise<void> => {
    console.log('🔄 API: Saving asset:', asset.id);
    const response = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
    });
    await checkResponse(response, 'POST /assets');
};

export const importAssetsToApi = async (assets: any[]): Promise<void> => {
    console.log('🔄 API: Importing', assets.length, 'assets...');

    // Helper: Detect if data is already flat (no nested children arrays in first few items)
    // or if it's a tree.
    const isAlreadyFlat = assets.some(a => a.parent_id !== undefined && (!a.children || a.children.length === 0));

    let flat: any[] = [];

    if (isAlreadyFlat) {
        console.log('ℹ️ Detected Flat Asset List. Importing as-is.');
        flat = assets.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            parent_id: a.parent_id || null // Keep existing parent_id
        }));
    } else {
        console.log('ℹ️ Detected Asset Tree. Flattening...');
        // Flatten tree to list for bulk import ensuring parent comes before children
        const flatten = (nodes: any[], parentId?: string): any[] => {
            let result: any[] = [];
            for (const n of nodes) {
                // Add parent first
                result.push({ id: n.id, name: n.name, type: n.type, parent_id: parentId || null });
                // Then recursively add children
                if (n.children && n.children.length > 0) {
                    result = [...result, ...flatten(n.children, n.id)];
                }
            }
            return result;
        };
        flat = flatten(assets);
    }

    // Limpar assets atuais antes de importar para garantir integridade da árvore vinda do JSON
    console.log('🧹 API: Cleaning existing assets before import...');
    try {
        const flatAssets = await fetch(`${API_BASE}/assets/flat`).then(r => r.json());
        for (const asset of flatAssets) {
            await fetch(`${API_BASE}/assets/${asset.id}`, { method: 'DELETE' });
        }
    } catch (e) {
        console.warn('⚠️ API: Could not clean all assets, proceeding with import...', e);
    }

    const response = await fetch(`${API_BASE}/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flat)
    });
    await checkResponse(response, 'POST /assets/bulk');
};

// --- TAXONOMY ---
export const fetchTaxonomy = async (): Promise<TaxonomyConfig> => {
    console.log('🔄 API: Fetching taxonomy...');
    const response = await fetch(`${API_BASE}/taxonomy`);
    return checkResponse(response, 'GET /taxonomy');
};

export const saveTaxonomyToApi = async (taxonomy: TaxonomyConfig): Promise<void> => {
    console.log('🔄 API: Saving taxonomy...');
    const response = await fetch(`${API_BASE}/taxonomy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taxonomy)
    });
    await checkResponse(response, 'PUT /taxonomy');
};

export const importTaxonomyToApi = async (taxonomy: TaxonomyConfig): Promise<void> => {
    // Taxonomy is usually a single object configuration, so "bulk" might just be "save".
    // But if we want to merge, logic might be complex. 
    // For now, treating import as "save/overwrite" or using the existing save method is safer
    // but the task implies usage of API. saveTaxonomyToApi replaces the whole config.
    // We'll reuse saveTaxonomyToApi for consistency unless a merge is strictly required by backend logic unique to import.
    // CSV import logic in csvService already merges locally before calling save.
    // So here we likely just need to save the result.
    return saveTaxonomyToApi(taxonomy);
};


// --- RECORDS (RCAs) ---
export const fetchRecords = async (): Promise<RcaRecord[]> => {
    console.log('🔄 API: Fetching RCAs...');
    const response = await fetch(`${API_BASE}/rcas`);
    return checkResponse(response, 'GET /rcas');
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

export const saveRecordToApi = async (record: RcaRecord): Promise<void> => {
    console.log('🔄 API: Saving RCA:', record.id);

    // Verificar se já existe
    const existing = await fetchRecordById(record.id);

    if (existing) {
        console.log('🔄 API: Updating existing RCA...');
        const response = await fetch(`${API_BASE}/rcas/${record.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        await checkResponse(response, `PUT /rcas/${record.id}`);
    } else {
        console.log('🔄 API: Creating new RCA...');
        const response = await fetch(`${API_BASE}/rcas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        await checkResponse(response, 'POST /rcas');
    }
    console.log('✅ API: RCA saved successfully:', record.id);
};

export const deleteRecordFromApi = async (id: string): Promise<void> => {
    console.log('🔄 API: Deleting RCA:', id);
    const response = await fetch(`${API_BASE}/rcas/${id}`, { method: 'DELETE' });
    await checkResponse(response, `DELETE /rcas/${id}`);
    console.log('✅ API: RCA deleted:', id);
};

export const importRecordsToApi = async (records: RcaRecord[]): Promise<void> => {
    console.log('🔄 API: Importing', records.length, 'records...');
    // Assuming backend supports bulk import, otherwise we could iterate.
    // For safety/consistency with Assets, trying bulk endpoint implies backend support.
    // If backend doesn't support bulk for records, we might need a loop or update backend.
    // Given the task, I will implement as bulk POST.
    const response = await fetch(`${API_BASE}/rcas/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records)
    });
    await checkResponse(response, 'POST /rcas/bulk');
};

// --- ACTIONS ---
export const fetchActions = async (): Promise<ActionRecord[]> => {
    console.log('🔄 API: Fetching actions...');
    const response = await fetch(`${API_BASE}/actions`);
    return checkResponse(response, 'GET /actions');
};

export const fetchActionsByRca = async (rcaId: string): Promise<ActionRecord[]> => {
    const response = await fetch(`${API_BASE}/actions?rca_id=${rcaId}`);
    return checkResponse(response, `GET /actions?rca_id=${rcaId}`);
};

export const saveActionToApi = async (action: ActionRecord): Promise<void> => {
    console.log('🔄 API: Saving action:', action.id);

    // Verificar se já existe
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
    console.log('🔄 API: Deleting action:', id);
    const response = await fetch(`${API_BASE}/actions/${id}`, { method: 'DELETE' });
    await checkResponse(response, `DELETE /actions/${id}`);
};

// --- HELPER: Recalcular Status da RCA ---
// ⚠️ ISSUE #20 - MIGRAÇÃO DE LÓGICA PARA BACKEND
// ==============================================================================
// A função recalculateRcaStatus foi REMOVIDA do frontend.
// O backend (rcaStatusService.ts) agora é a ÚNICA fonte da verdade.
// 
// O backend calcula o status automaticamente em:
// - POST/PUT /api/rcas
// - POST/PUT/DELETE /api/actions
// 
// Não é mais necessário chamar recalculateRcaStatus do frontend.
// ==============================================================================


export const importActionsToApi = async (actions: ActionRecord[]): Promise<void> => {
    console.log('🔄 API: Importing', actions.length, 'actions...');
    const response = await fetch(`${API_BASE}/actions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actions)
    });
    await checkResponse(response, 'POST /actions/bulk');
    // Note: Backend now handles status recalculation automatically via rcaStatusService
};


// --- TRIGGERS ---
export const fetchTriggers = async (): Promise<TriggerRecord[]> => {
    console.log('🔄 API: Fetching triggers...');
    const response = await fetch(`${API_BASE}/triggers`);
    return checkResponse(response, 'GET /triggers');
};

export const saveTriggerToApi = async (trigger: TriggerRecord): Promise<void> => {
    console.log('🔄 API: Saving trigger:', trigger.id);

    const checkResponse_local = await fetch(`${API_BASE}/triggers/${trigger.id}`);

    if (checkResponse_local.ok) {
        const response = await fetch(`${API_BASE}/triggers/${trigger.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trigger)
        });
        await checkResponse(response, `PUT /triggers/${trigger.id}`);
    } else {
        const response = await fetch(`${API_BASE}/triggers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trigger)
        });
        await checkResponse(response, 'POST /triggers');
    }
};

export const deleteTriggerFromApi = async (id: string): Promise<void> => {
    console.log('🔄 API: Deleting trigger:', id);
    const response = await fetch(`${API_BASE}/triggers/${id}`, { method: 'DELETE' });
    await checkResponse(response, `DELETE /triggers/${id}`);
};

export const importTriggersToApi = async (triggers: TriggerRecord[]): Promise<void> => {
    console.log('🔄 API: Importing', triggers.length, 'triggers...');
    const response = await fetch(`${API_BASE}/triggers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(triggers)
    });
    await checkResponse(response, 'POST /triggers/bulk');
};


// --- HELPER: Gerar ID (Simples) ---
const generateId = (prefix: string = 'GEN'): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
};

// --- HELPER: Extrair Assets de RCAs (Fallback) ---
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
        // Nível 1: Area
        if (r.area_id) {
            addAsset(r.area_id, r.area_id, 'AREA', null);
        }

        // Nível 2: Equipment (Filho de Area)
        if (r.equipment_id && r.area_id) {
            addAsset(r.equipment_id, r.equipment_id, 'EQUIPMENT', r.area_id);
        }

        // Nível 3: Subgroup (Filho de Equipment)
        if (r.subgroup_id && r.equipment_id) {
            addAsset(r.subgroup_id, r.subgroup_id, 'SUBGROUP', r.equipment_id);
        }
    });

    console.log(`ℹ️ Auto-extracted ${assetsMap.size} assets from RCAs records.`);
    return Array.from(assetsMap.values());
};

// --- HELPER: Delete All Records (sequential to avoid overload if no bulk delete) ---
const deleteAllRecords = async () => {
    const rcas = await fetchRecords();
    const ids = rcas.map(r => r.id);
    if (ids.length === 0) return;

    console.log(`🧹 Wiping ${ids.length} RCAs via Bulk Delete...`);
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

    console.log(`🧹 Wiping ${ids.length} Actions via Bulk Delete...`);
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

    console.log(`🧹 Wiping ${ids.length} Triggers via Bulk Delete...`);
    const response = await fetch(`${API_BASE}/triggers/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    await checkResponse(response, 'POST /triggers/bulk-delete');
};

// --- IMPORTAÇÃO EM MASSA ---
export const importDataToApi = async (data: any, mode: 'APPEND' | 'UPDATE' | 'REPLACE' = 'REPLACE', taxonomyFilters?: string[]): Promise<{ success: boolean, message: string }> => {
    console.log(`🔄 API: Importing bulk data [Mode: ${mode}]...`, {
        hasAssets: !!data.assets,
        recordsCount: data.records?.length || 0,
        filters: taxonomyFilters
    });

    try {
        // 0. REPLACE MODE: Cleaning Phase
        if (mode === 'REPLACE') {
            console.log('⚠️ REPLACE MODE: Wiping existing data...');
            // Order matters: Children first (Actions/Triggers) then Parents (RCAs)
            await Promise.all([deleteAllActions(), deleteAllTriggers()]);
            await deleteAllRecords();
            // Assets are cleaned inside importAssetsToApi below
        }

        // 1. Preparar Assets (Recuperar do JSON ou Extrair das RCAs)
        let assetsToImport = data.assets;

        if (!assetsToImport || assetsToImport.length === 0) {
            const rcas = data.records || data.results || [];
            if (rcas.length > 0) {
                console.log('⚠️ JSON sem assets explícitos. Tentando extrair das RCAs...');
                assetsToImport = extractAssetsFromRecords(rcas);
            }
        }

        // 2. Importar Assets (sempre substitui se houver assets no JSON)
        if (assetsToImport && assetsToImport.length > 0) {
            await importAssetsToApi(assetsToImport);
            console.log('✅ Assets importados/verificados:', assetsToImport.length);
        } else {
            console.warn('⚠️ Nenhum asset encontrado para importar.');
        }

        // 2. Importar Taxonomy (Merge com Auto-Discovery e Filtros)
        const currentTaxonomy = await fetchTaxonomy();
        const incomingTaxonomy = data.taxonomy || {};

        // Start with current DB state
        let taxonomyToSave: TaxonomyConfig = { ...currentTaxonomy };

        // Determine which keys to import
        // If filters are provided, strict filter. If not provided (legacy), import ALL from incoming.
        const keysToProcess = taxonomyFilters && taxonomyFilters.length > 0
            ? taxonomyFilters
            : Object.keys(incomingTaxonomy);

        console.log('Applying Taxonomy Filters:', keysToProcess);

        keysToProcess.forEach((key: string) => {
            // Type safety check: only import if it exists in incoming data
            // We cast key to keyof TaxonomyConfig for assignment
            if (key in incomingTaxonomy) {
                // @ts-ignore - Dynamic assignment
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

        // 2.1 Varre RCAs para atualizar taxonomia e normalizar IDs
        const rcasToImportRaw = data.records || data.results || [];
        const actionsToImportRaw = data.actions || [];
        const triggersToImportRaw = data.triggers || [];

        // --- APPEND LOGIC: ID REMAPPING ---
        const idMap = new Map<string, string>(); // oldId -> newId

        if (mode === 'APPEND') {
            console.log('➕ APPEND MODE: Regenerating IDs...');
            rcasToImportRaw.forEach((r: any) => idMap.set(r.id, generateId('RCA')));
            actionsToImportRaw.forEach((a: any) => idMap.set(a.id, generateId('ACT')));
            triggersToImportRaw.forEach((t: any) => idMap.set(t.id, generateId('TRG')));
        }

        const resolveId = (oldId: string, type: 'RCA' | 'ACT' | 'TRG') => {
            if (mode !== 'APPEND') return oldId; // Keep ID
            return idMap.get(oldId) || generateId(type); // Return mapped or new
        };

        const resolveRef = (refId: string) => {
            if (mode !== 'APPEND') return refId;
            return idMap.get(refId) || refId; // Try to find reference, else keep (might be external or broken, but best effort)
        };


        // Map RCA IDs to their Actions (for Status Logic) - Using NEW IDs if Append
        const rcaActionsMap = new Map<string, any[]>();
        actionsToImportRaw.forEach((a: any) => {
            if (a.rca_id) {
                const targetRcaId = resolveRef(a.rca_id);
                const list = rcaActionsMap.get(targetRcaId) || [];
                // Store incomplete action obj just for status calculation
                list.push({ ...a, status: String(a.status) });
                rcaActionsMap.set(targetRcaId, list);
            }
        });

        // Auto-Discovery of Relationships (Hierarchy)
        const discoveredRelations = new Map<string, Set<string>>();

        const normalizedRcas = rcasToImportRaw.map((rec: any) => {
            const newRec = { ...rec };

            // Apply ID Remapping
            newRec.id = resolveId(rec.id, 'RCA');

            // 1. Mandatory Fields Check
            const mandatoryStrings = [
                newRec.analysis_type,
                newRec.what,
                newRec.problem_description,
                newRec.subgroup_id,
                newRec.who,
                newRec.when,
                newRec.where_description,
                newRec.specialty_id,
                newRec.failure_mode_id,
                newRec.failure_category_id,
                newRec.component_type
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
            const impactsOk = (newRec.downtime_minutes !== undefined && newRec.downtime_minutes !== null);
            const isMandatoryComplete = stringsOk && participantsOk && rootCausesOk && impactsOk;

            // 2. Action Plan Analysis (using mapped IDs)
            const mainActions = rcaActionsMap.get(newRec.id) || [];
            const hasMainActions = mainActions.length > 0;
            const allActionsEffective = hasMainActions && mainActions.every(a => ['3', '4'].includes(String(a.status)));

            // 3. Status Logic
            let currentStatus = ensureTaxonomy('analysisStatuses', newRec.status) || newRec.status;
            const isOpenStatus = !currentStatus || currentStatus === '' || currentStatus === 'STATUS-01' || currentStatus === 'Em Andamento';

            if (isOpenStatus) {
                if (!isMandatoryComplete) {
                    newRec.status = 'STATUS-01';
                } else {
                    if (!hasMainActions) {
                        newRec.status = 'STATUS-03';
                    } else if (allActionsEffective) {
                        newRec.status = 'STATUS-03';
                    } else {
                        newRec.status = 'STATUS-WAITING';
                    }
                }
            } else {
                newRec.status = currentStatus;
            }

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

            if (newRec.failure_mode_id && newRec.specialty_id) {
                if (!discoveredRelations.has(newRec.failure_mode_id)) {
                    discoveredRelations.set(newRec.failure_mode_id, new Set());
                }
                discoveredRelations.get(newRec.failure_mode_id)?.add(newRec.specialty_id);
            }

            // --- Whys Conversion (Task 55) ---
            if ((!newRec.five_whys_chains || newRec.five_whys_chains.length === 0) && (newRec.five_whys && newRec.five_whys.length > 0)) {
                const validWhys = newRec.five_whys.filter((w: any) => w.answer && w.answer.trim().length > 0);
                if (validWhys.length > 0) {
                    // Conversion Logic same as before...
                    const chainId = generateId('chain');
                    newRec.five_whys_chains = [{
                        chain_id: chainId,
                        cause_effect: newRec.problem_description || 'Fluxo Principal',
                        root_node: {
                            id: generateId('node'),
                            level: 0,
                            cause_effect: newRec.problem_description || 'Problema Principal',
                            whys: validWhys.map((w: any, idx: number) => ({
                                level: idx + 1,
                                answer: w.answer
                            })),
                            children: []
                        }
                    }];
                }
            }

            return newRec;
        });

        if (discoveredRelations.size > 0 && taxonomyToSave.failureModes) {
            taxonomyToSave.failureModes = taxonomyToSave.failureModes.map(fm => {
                if (discoveredRelations.has(fm.id)) {
                    const foundSpecs = Array.from(discoveredRelations.get(fm.id)!);
                    const existingSpecs = fm.specialty_ids || [];
                    const mergedSpecs = Array.from(new Set([...existingSpecs, ...foundSpecs]));
                    return { ...fm, specialty_ids: mergedSpecs };
                }
                return fm;
            });
        }

        await saveTaxonomyToApi(taxonomyToSave);
        console.log('✅ Taxonomy atualizada.');

        // --- IMPORT EXECUTION (Based on Mode) ---

        // 3. RCAs
        if (normalizedRcas.length > 0) {
            if (mode === 'UPDATE') {
                console.log('🔄 UPDATE MODE: Upserting records...');
                // Sequential to be safe with DB locks if any, or Promise.all for speed. 
                // Promise.all is better for API calls.
                await Promise.all(normalizedRcas.map(r => saveRecordToApi(r)));
            } else {
                // REPLACE (Bulk Insert after Delete) or APPEND (Bulk Insert with new IDs)
                console.log('🔄 Bulk Importing RCAs...');
                const response = await fetch(`${API_BASE}/rcas/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(normalizedRcas)
                });
                await checkResponse(response, 'POST /rcas/bulk');
            }
            console.log(`✅ RCAs processadas (${mode}):`, normalizedRcas.length);
        }

        // 4. Actions
        const preparedActions = actionsToImportRaw.map((a: any) => ({
            ...a,
            id: resolveId(a.id, 'ACT'),
            rca_id: resolveRef(a.rca_id)
        }));

        if (preparedActions.length > 0) {
            if (mode === 'UPDATE') {
                console.log('🔄 UPDATE MODE: Upserting actions...');
                // Actions might fail if RCA doesn't exist? (Foreign Key). 
                // If UPDATE mode, we assume RCAs were processed above (Upserted).
                await Promise.all(preparedActions.map(a => saveActionToApi(a)));
            } else {
                console.log('🔄 Bulk Importing Actions...');
                const response = await fetch(`${API_BASE}/actions/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(preparedActions)
                });
                await checkResponse(response, 'POST /actions/bulk');
            }
            console.log(`✅ Actions processadas (${mode}):`, preparedActions.length);
        }

        // 5. Triggers
        const preparedTriggers = triggersToImportRaw.map((t: any) => ({
            ...t,
            id: resolveId(t.id, 'TRG'),
            // Triggers might link to RCA? 
            // TriggerRecord usually has `rca_id`? Let's check type.
            // If it does, we should resolveRef.
        }));

        // Note: Assuming TriggerRecord *might* have rca_id if they serve as source.
        // It wasn't in the explicit map above, but if it exists, resolve it:
        // Checking schema: triggers table has no rca_id foreign key usually?
        // Wait, "Trigger -> RCA" link. Usually RCA references Trigger? Or Trigger references RCA?
        // Let's assume Trigger might have it. If not, this property just does nothing.
        // Actually, Triggers often don't point to RCA in this system, RCAs are created *from* Triggers.
        // But if they are linked, it's good to try.

        if (preparedTriggers.length > 0) {
            if (mode === 'UPDATE') {
                console.log('🔄 UPDATE MODE: Upserting triggers...');
                await Promise.all(preparedTriggers.map(t => saveTriggerToApi(t)));
            } else {
                console.log('🔄 Bulk Importing Triggers...');
                const response = await fetch(`${API_BASE}/triggers/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(preparedTriggers)
                });
                await checkResponse(response, 'POST /triggers/bulk');
            }
            console.log(`✅ Triggers processados (${mode}):`, preparedTriggers.length);
        }

        return {
            success: true,
            message: `Importação (${mode}) concluída: ${normalizedRcas.length} RCAs, ${preparedActions.length} ações.`
        };
    } catch (error) {
        console.error('❌ Erro na importação:', error);
        return { success: false, message: `Erro: ${error}` };
    }
};
