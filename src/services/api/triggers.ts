
/**
 * Proposta: Serviço de API para gestão de Gatilhos (Triggers).
 * Fluxo: Implementa a busca, persistência individual e em massa, e exclusão de eventos de parada técnica no backend.
 */

import { TriggerRecord } from "../../types";
import { API_BASE, checkResponse } from "./base";
import { logger } from "../../utils/logger";

// --- GATILHOS (TRIGGERS) ---

export const fetchTriggers = async (): Promise<TriggerRecord[]> => {
    logger.info('API: Buscando lista de gatilhos...');
    const response = await fetch(`${API_BASE}/triggers`);
    return checkResponse<TriggerRecord[]>(response, 'GET /triggers');
};

export const saveTriggerToApi = async (trigger: TriggerRecord, isUpdate?: boolean): Promise<void> => {
    logger.info('API: Persistindo gatilho:', trigger.id);

    if (isUpdate === true) {
        const response = await fetch(`${API_BASE}/triggers/${trigger.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trigger)
        });
        await checkResponse<void>(response, `PUT /triggers/${trigger.id}`);
        return;
    }

    if (isUpdate === false) {
        const response = await fetch(`${API_BASE}/triggers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trigger)
        });
        await checkResponse<void>(response, 'POST /triggers');
        return;
    }

    // Tenta atualizar primeiro se tiver ID (abordagem padrão para updates)
    if (trigger.id) {
        try {
            const checkRes = await fetch(`${API_BASE}/triggers/${trigger.id}`);
            if (checkRes.ok) {
                logger.info('API: Registro existente encontrado. Atualizando (PUT)...');
                const updateResponse = await fetch(`${API_BASE}/triggers/${trigger.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(trigger)
                });
                await checkResponse<void>(updateResponse, `PUT /triggers/${trigger.id}`);
                return;
            }
        } catch (e) {
            logger.warn('API: Falha ao verificar existência do gatilho, tentando POST...');
        }
    }

    // Se não existir ou não tiver ID, tenta criar (POST)
    const response = await fetch(`${API_BASE}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trigger)
    });
    await checkResponse<void>(response, 'POST /triggers');
};

export const deleteTriggerFromApi = async (id: string): Promise<void> => {
    logger.info('API: Excluindo gatilho:', id);
    const response = await fetch(`${API_BASE}/triggers/${id}`, { method: 'DELETE' });
    await checkResponse<void>(response, `DELETE /triggers/${id}`);
};

export const importTriggersToApi = async (triggers: TriggerRecord[]): Promise<void> => {
    logger.info('API: Importando lote de gatilhos...', triggers.length);
    const response = await fetch(`${API_BASE}/triggers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(triggers)
    });
    await checkResponse<void>(response, 'POST /triggers/bulk');
};

