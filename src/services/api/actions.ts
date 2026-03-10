/**
 * Proposta: Serviço de API para gestão de Planos de Ação (CAPA).
 * Fluxo: Provê métodos para busca, salvamento individual e importação em massa de ações corretivas vinculadas às análises RCA.
 */

import { ActionRecord } from "../../types";
import { API_BASE, checkResponse } from "./base";
import { logger } from "../../utils/logger";

// --- PLANOS DE AÇÃO (CAPA) ---

export const fetchActions = async (): Promise<ActionRecord[]> => {
    logger.info('API: Buscando lista de planos de ação...');
    const response = await fetch(`${API_BASE}/actions`);
    return checkResponse<ActionRecord[]>(response, 'GET /actions');
};

export const fetchActionsByRca = async (rcaId: string): Promise<ActionRecord[]> => {
    const response = await fetch(`${API_BASE}/actions?rca_id=${rcaId}`);
    return checkResponse<ActionRecord[]>(response, `GET /actions?rca_id=${rcaId}`);
};

export const saveActionToApi = async (action: ActionRecord, isUpdate?: boolean): Promise<void> => {
    logger.info('API: Persistindo plano de ação:', action.id);

    if (isUpdate === true) {
        const response = await fetch(`${API_BASE}/actions/${action.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        await checkResponse<void>(response, `PUT /actions/${action.id}`);
        return;
    }

    if (isUpdate === false) {
        const response = await fetch(`${API_BASE}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        await checkResponse<void>(response, 'POST /actions');
        return;
    }

    const checkRes = await fetch(`${API_BASE}/actions/${action.id}`);

    if (checkRes.ok) {
        const response = await fetch(`${API_BASE}/actions/${action.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        await checkResponse<void>(response, `PUT /actions/${action.id}`);
    } else {
        const response = await fetch(`${API_BASE}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        await checkResponse<void>(response, 'POST /actions');
    }
};

export const deleteActionFromApi = async (id: string): Promise<void> => {
    logger.info('API: Excluindo plano de ação:', id);
    const response = await fetch(`${API_BASE}/actions/${id}`, { method: 'DELETE' });
    await checkResponse<void>(response, `DELETE /actions/${id}`);
};

export const importActionsToApi = async (actions: ActionRecord[]): Promise<void> => {
    logger.info('API: Importando lote de planos de ação...', actions.length);
    const response = await fetch(`${API_BASE}/actions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actions)
    });
    await checkResponse<void>(response, 'POST /actions/bulk');
};
