/**
 * Proposta: Utilitários para gestão e visualização de Gatilhos (Triggers).
 * Fluxo: Provê funções de cálculo de duração, resolução de nomes de ativos via busca em largura (BFS) e lógica visual de Farol (SLA).
 */

import { AssetNode, TaxonomyConfig } from '../types';
import { STATUS_IDS, TRIGGER_STATUS_IDS, getStatusBadgeStyle } from '../constants/SystemConstants';

/**
 * Busca o nome de um ativo na árvore de forma iterativa (BFS).
 * Refatorado para evitar Stack Overflow em árvores muito profundas.
 */
export const getAssetName = (id: string, nodes: AssetNode[]): string => {
    if (!id) return '';
    if (!nodes || nodes.length === 0) return id;

    const queue = [...nodes];
    const visited = new Set<string>();
    let safetyCounter = 0;

    while (queue.length > 0) {
        safetyCounter++;
        if (safetyCounter > 50000) {
            console.warn('getAssetName atingiu limite de segurança (possível ciclo):', id);
            return id;
        }

        const node = queue.shift();
        if (!node) continue;

        if (visited.has(node.id)) continue;
        visited.add(node.id);

        if (node.id === id) return node.name;

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                queue.push(child);
            }
        }
    }
    return id; // Fallback para o ID caso o nome não seja encontrado
};

export const getTaxonomyName = (list: any[], id: string) => {
    const item = list?.find(i => i.id === id);
    return item ? item.name : id;
};

export const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(diff / 60000); // Retorno em minutos
};

export const findAssetPath = (nodes: AssetNode[], targetId: string): AssetNode[] | null => {
    for (const node of nodes) {
        if (node.id === targetId) return [node];
        if (node.children) {
            const path = findAssetPath(node.children, targetId);
            if (path) return [node, ...path];
        }
    }
    return null;
};

/**
 * Define a estilização (Tailwind) do badge de status com base no ID da taxonomia.
 * Delega ao mapa centralizado STATUS_BADGE_STYLES (Issue #92).
 * Parametro taxonomy mantido para retrocompatibilidade de chamadas existentes.
 */
export const getStatusColor = (statusId: string, _taxonomy: TaxonomyConfig) =>
    getStatusBadgeStyle(statusId);


/**
 * Calcula o indicador de Farol (SLA) com base nos dias de abertura.
 */
export const getFarol = (startDate: string, statusId: string, taxonomy: TaxonomyConfig) => {
    if (!startDate) return { days: 0, color: 'bg-gray-100 text-gray-500' };

    try {
        if (statusId === STATUS_IDS.CONCLUDED || statusId === TRIGGER_STATUS_IDS.CONVERTED) {
            return { days: 'CHECK', color: 'bg-green-100 text-green-700 border border-green-200' };
        }

        const isClosed = statusId === STATUS_IDS.CONCLUDED ||
            statusId === STATUS_IDS.CANCELLED ||
            statusId === TRIGGER_STATUS_IDS.CONVERTED ||
            statusId === TRIGGER_STATUS_IDS.ARCHIVED ||
            statusId === 'REMOVED' || statusId === 'IGNORADA';

        const start = new Date(startDate);
        if (isNaN(start.getTime())) return { days: 0, color: 'bg-gray-100 text-gray-500' };

        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let color = 'bg-green-100 text-green-700';
        if (days >= 3) color = 'bg-yellow-100 text-yellow-700';
        if (days >= 7) color = 'bg-red-100 text-red-700';

        if (isClosed) {
            color = 'bg-gray-100 text-gray-400'; // Estilo esmaecido para itens encerrados
        }

        return { days, color };
    } catch (e) {
        console.error("Erro ao calcular Farol:", e);
        return { days: 0, color: 'bg-red-500 text-white' };
    }
};