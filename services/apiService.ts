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

// --- IMPORTAÇÃO EM MASSA ---
export const importDataToApi = async (data: MigrationData): Promise<{ success: boolean, message: string }> => {
    console.log('🔄 API: Importing bulk data...');

    try {
        // 1. Importar Assets
        if (data.assets && data.assets.length > 0) {
            await importAssetsToApi(data.assets);
            console.log('✅ Assets importados:', data.assets.length);
        }

        // 2. Importar Taxonomy
        if (data.taxonomy) {
            await saveTaxonomyToApi(data.taxonomy);
            console.log('✅ Taxonomy importada');
        }

        // 3. Importar RCAs (Bulk Optimized)
        if (data.records && data.records.length > 0) {
            console.log('🔄 API: Bulk Importing RCAs...');
            const response = await fetch(`${API_BASE}/rcas/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.records)
            });
            await checkResponse(response, 'POST /rcas/bulk');
            console.log('✅ RCAs importadas (Bulk):', data.records.length);
        }

        // 4. Importar Actions
        if (data.actions && data.actions.length > 0) {
            for (const action of data.actions) {
                await saveActionToApi(action);
            }
            console.log('✅ Actions importadas:', data.actions.length);
        }

        // 5. Importar Triggers
        if (data.triggers && data.triggers.length > 0) {
            for (const trigger of data.triggers) {
                await saveTriggerToApi(trigger);
            }
            console.log('✅ Triggers importados:', data.triggers.length);
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
