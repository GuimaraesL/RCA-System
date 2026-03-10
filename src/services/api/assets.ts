
/**
 * Proposta: Serviço de API para gestão de Ativos Técnicos.
 * Fluxo: Implementa a comunicação com o backend para busca da árvore de ativos, salvamento individual e importação em massa com achatamento de hierarquia.
 */

import { AssetNode } from "../../types";
import { API_BASE, checkResponse } from "./base";
import { logger } from "../../utils/logger";

// --- GESTÃO DE ATIVOS (ASSETS) ---

export const fetchAssets = async (): Promise<AssetNode[]> => {
    logger.info('API: Buscando árvore de ativos...');
    const response = await fetch(`${API_BASE}/assets`);
    return checkResponse<AssetNode[]>(response, 'GET /assets');
};

export const saveAssetToApi = async (asset: Partial<AssetNode> & { id: string }): Promise<void> => {
    logger.info('API: Salvando ativo:', asset.id);
    const response = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
    });
    await checkResponse<void>(response, 'POST /assets');
};

export const importAssetsToApi = async (assets: AssetNode[]): Promise<void> => {
    logger.info('API: Iniciando importação de ativos...', assets.length);

    // Detecta se a lista está em formato plano ou em árvore para decidir a estratégia de importação
    const isAlreadyFlat = assets.some(a => a.parentId !== undefined && (!a.children || a.children.length === 0));

    let flat: Omit<AssetNode, 'children'>[] = [];

    if (isAlreadyFlat) {
        logger.info('API: Lista plana detectada. Importando sem transformações.');
        flat = assets.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            parentId: a.parentId || null as any
        }));
    } else {
        logger.info('API: Árvore de ativos detectada. Realizando achatamento (flattening)...');
        const flatten = (nodes: AssetNode[], parentId?: string): Omit<AssetNode, 'children'>[] => {
            let result: Omit<AssetNode, 'children'>[] = [];
            for (const n of nodes) {
                result.push({ id: n.id, name: n.name, type: n.type, parentId: parentId || null as any });
                if (n.children && n.children.length > 0) {
                    result = [...result, ...flatten(n.children, n.id)];
                }
            }
            return result;
        };
        flat = flatten(assets);
    }

    // Limpa ativos existentes para evitar inconsistências hierárquicas em restaurações completas
    logger.info('API: Limpando ativos existentes antes da importação...');
    try {
        const responseFlat = await fetch(`${API_BASE}/assets/flat`);
        const flatAssets = await responseFlat.json();
        for (const asset of flatAssets) {
            await fetch(`${API_BASE}/assets/${asset.id}`, { method: 'DELETE' });
        }
    } catch (e) {
        logger.warn('API: Falha ao limpar alguns ativos, prosseguindo com a importação...', e);
    }

    const response = await fetch(`${API_BASE}/assets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flat)
    });
    await checkResponse<void>(response, 'POST /assets/bulk');
};

