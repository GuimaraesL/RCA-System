
import { AssetNode } from "../../types";
import { API_BASE, checkResponse } from "./base";

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
