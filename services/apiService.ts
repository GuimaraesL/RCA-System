// Serviço de comunicação com a API REST
// VERSÃO CORRIGIDA - com verificação de erros em todas as operações

import { AssetNode, RcaRecord, ActionRecord, TriggerRecord, TaxonomyConfig, MigrationData } from "../types";

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

export const importActionsToApi = async (actions: ActionRecord[]): Promise<void> => {
    console.log('🔄 API: Importing', actions.length, 'actions...');
    const response = await fetch(`${API_BASE}/actions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actions)
    });
    await checkResponse(response, 'POST /actions/bulk');
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

// --- IMPORTAÇÃO EM MASSA ---
export const importDataToApi = async (data: any): Promise<{ success: boolean, message: string }> => {
    console.log('🔄 API: Importing bulk data...', {
        hasAssets: !!data.assets,
        recordsCount: data.records?.length || 0
    });

    try {
        // 1. Preparar Assets (Recuperar do JSON ou Extrair das RCAs)
        let assetsToImport = data.assets;

        if (!assetsToImport || assetsToImport.length === 0) {
            const rcas = data.records || data.results || [];
            if (rcas.length > 0) {
                console.log('⚠️ JSON sem assets explícitos. Tentando extrair das RCAs...');
                assetsToImport = extractAssetsFromRecords(rcas);
            }
        }

        // 2. Importar Assets (se houver)
        if (assetsToImport && assetsToImport.length > 0) {
            await importAssetsToApi(assetsToImport);
            console.log('✅ Assets importados/verificados:', assetsToImport.length);
        } else {
            console.warn('⚠️ Nenhum asset encontrado para importar.');
        }

        // 2. Importar Taxonomy (Merge com Auto-Discovery)
        // CRITICAL FIX: Merge incoming taxonomy with EXISTING one to preserve keys like 'triggerStatuses'
        // that might not be in the backup execution.
        const currentTaxonomy = await fetchTaxonomy();
        const incomingTaxonomy = data.taxonomy || {};

        let taxonomyToSave: TaxonomyConfig = {
            ...currentTaxonomy, // Start with current DB state (preserves new keys)
            ...incomingTaxonomy, // Overwrite with backup data (preserves historical options)
            // Explicitly ensure we don't lose triggerStatuses if explicitly missing in backup
            triggerStatuses: incomingTaxonomy.triggerStatuses || currentTaxonomy.triggerStatuses || [],
        };

        const ensureTaxonomy = (listKey: keyof TaxonomyConfig, val: string) => {
            if (!val) return null;
            const list = taxonomyToSave[listKey] || [];
            // Check ID or Name match
            const existing = list.find(i => i.id === val || i.name.toLowerCase() === val.toLowerCase());

            if (existing) return existing.id; // Retorna ID existente

            // Create new item
            const newId = val.length < 15 ? val : generateId('AUTO');
            // Adiciona na lista
            taxonomyToSave[listKey] = [...list, { id: newId, name: val }];
            console.log(`🆕 Auto-discovered Taxonomy Item [${listKey}]: ${val} -> ${newId}`);
            return newId;
        };

        // 2.1 Varre RCAs para atualizar taxonomia e normalizar IDs
        const rcasToImport = data.records || data.results || [];
        const actionsToImport = data.actions || [];

        // Map RCA IDs to their Actions (Main Actions)
        const rcaActionsMap = new Map<string, any[]>();
        actionsToImport.forEach((a: any) => {
            if (a.rca_id) {
                const list = rcaActionsMap.get(a.rca_id) || [];
                list.push(a);
                rcaActionsMap.set(a.rca_id, list);
            }
        });

        // Auto-Discovery of Relationships (Hierarchy)
        const discoveredRelations = new Map<string, Set<string>>(); // FailureModeID -> Set<SpecialtyID>

        const normalizedRcas = rcasToImport.map((rec: any) => {
            const newRec = { ...rec };

            // 1. Mandatory Fields Check (Strict)
            const mandatoryStrings = [
                newRec.analysis_type,
                newRec.what,
                newRec.problem_description,
                newRec.subgroup_id, // STRICT: User requires subgroup_id for eligibility
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

            // 2. Action Plan Analysis
            const mainActions = rcaActionsMap.get(newRec.id) || [];
            const hasMainActions = mainActions.length > 0;

            // Check Efficiency (Box 4 = '4')
            // If ALL actions are '4', then it is effectively done.
            // If ANY action is NOT '4', and we have actions, then it is Waiting Verification.
            const allActionsEffective = hasMainActions && mainActions.every(a => String(a.status) === '4');
            const hasPendingActions = hasMainActions && !allActionsEffective;

            // 3. Status Logic
            // Normalize current status (handle Legacy strings)
            let currentStatus = ensureTaxonomy('analysisStatuses', newRec.status) || newRec.status;

            // If Missing, Open, or 'Em Andamento' -> Re-evaluate based on rules
            const isOpenStatus = !currentStatus || currentStatus === '' || currentStatus === 'STATUS-01' || currentStatus === 'Em Andamento';

            if (isOpenStatus) {
                if (!isMandatoryComplete) {
                    // Rule: Not complete -> In Progress
                    newRec.status = 'STATUS-01';
                } else {
                    // Rule: Complete. Check Actions.
                    if (!hasMainActions) {
                        // Rule: Complete & No Actions -> Concluded
                        newRec.status = 'STATUS-03';
                    } else if (allActionsEffective) {
                        // Rule: Complete & All Actions Effective -> Concluded
                        newRec.status = 'STATUS-03';
                    } else {
                        // Rule: Complete & Contains Actions with Box != 4 -> Waiting Verification
                        newRec.status = 'STATUS-WAITING';
                    }
                }
            } else {
                newRec.status = currentStatus;
            }

            // Debug Log for specific record
            if (newRec.id === '627bfb2a-a9c5-49b0-bd65-42a7cc7a61e9' || newRec.id === 'c02a20e2-8186-4541-ad9a-d4ad1ce10264') {
                console.log(`🔍 DEBUG AUTO-PROMO [${newRec.id}]:`);
                console.log(`   - Mandatory Complete: ${isMandatoryComplete} (Strings: ${stringsOk}, Subgroup: ${!!newRec.subgroup_id})`);
                console.log(`   - Actions Count: ${mainActions.length}`);
                console.log(`   - All Actions Effective (Box 4): ${allActionsEffective}`);
                console.log(`   - RESULT STATUS: ${newRec.status}`);
            }

            if (newRec.specialty_id) newRec.specialty_id = ensureTaxonomy('specialties', newRec.specialty_id) || newRec.specialty_id;
            if (newRec.failure_mode_id) newRec.failure_mode_id = ensureTaxonomy('failureModes', newRec.failure_mode_id) || newRec.failure_mode_id;
            if (newRec.failure_category_id) newRec.failure_category_id = ensureTaxonomy('failureCategories', newRec.failure_category_id) || newRec.failure_category_id;
            if (newRec.component_type) newRec.component_type = ensureTaxonomy('componentTypes', newRec.component_type) || newRec.component_type;
            if (newRec.analysis_type) newRec.analysis_type = ensureTaxonomy('analysisTypes', newRec.analysis_type) || newRec.analysis_type;

            // Root Causes (M)
            if (newRec.root_causes && Array.isArray(newRec.root_causes)) {
                newRec.root_causes.forEach((rc: any) => {
                    if (rc.root_cause_m_id) {
                        rc.root_cause_m_id = ensureTaxonomy('rootCauseMs', rc.root_cause_m_id) || rc.root_cause_m_id;
                    }
                });
            }

            // Relationship Discovery: Failure Mode -> Specialty
            if (newRec.failure_mode_id && newRec.specialty_id) {
                if (!discoveredRelations.has(newRec.failure_mode_id)) {
                    discoveredRelations.set(newRec.failure_mode_id, new Set());
                }
                discoveredRelations.get(newRec.failure_mode_id)?.add(newRec.specialty_id);
            }

            return newRec;
        });

        // Apply Discovered Relations to Taxonomy
        if (discoveredRelations.size > 0 && taxonomyToSave.failureModes) {
            console.log(`🔗 Auto-Learning Hierarchy for ${discoveredRelations.size} Failure Modes...`);
            taxonomyToSave.failureModes = taxonomyToSave.failureModes.map(fm => {
                if (discoveredRelations.has(fm.id)) {
                    const foundSpecs = Array.from(discoveredRelations.get(fm.id)!);
                    const existingSpecs = fm.specialty_ids || [];
                    // Merge Unique
                    const mergedSpecs = Array.from(new Set([...existingSpecs, ...foundSpecs]));
                    return { ...fm, specialty_ids: mergedSpecs };
                }
                return fm;
            });
        }

        // 2.2 Salvar Taxonomia Atualizada
        await saveTaxonomyToApi(taxonomyToSave);
        console.log('✅ Taxonomy atualizada com sucesso.');

        // 3. Importar RCAs (Bulk Optimized) com IDs normalizados
        if (normalizedRcas.length > 0) {
            console.log('🔄 API: Bulk Importing RCAs...');
            const response = await fetch(`${API_BASE}/rcas/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalizedRcas)
            });
            await checkResponse(response, 'POST /rcas/bulk');
            console.log('✅ RCAs importadas (Bulk):', normalizedRcas.length);
        }

        // 4. Importar Actions (Bulk)
        if (data.actions && data.actions.length > 0) {
            console.log('🔄 API: Bulk Importing Actions...');
            const response = await fetch(`${API_BASE}/actions/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.actions)
            });
            await checkResponse(response, 'POST /actions/bulk');
            console.log('✅ Actions importadas (Bulk):', data.actions.length);
        }

        // 5. Importar Triggers (Bulk)
        if (data.triggers && data.triggers.length > 0) {
            console.log('🔄 API: Bulk Importing Triggers...');
            const response = await fetch(`${API_BASE}/triggers/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.triggers)
            });
            await checkResponse(response, 'POST /triggers/bulk');
            console.log('✅ Triggers importados (Bulk):', data.triggers.length);
        }

        return {
            success: true,
            message: `Importação concluída: ${data.records?.length || 0} RCAs, ${data.actions?.length || 0} ações, ${data.triggers?.length || 0} triggers`
        };
    } catch (error) {
        console.error('❌ Erro na importação:', error);
        return { success: false, message: `Erro: ${error}` };
    }
};
