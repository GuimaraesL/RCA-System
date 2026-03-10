
/**
 * Proposta: Serviço de API para gestão de Análises RCA.
 * Fluxo: Implementa a comunicação com o backend para busca, salvamento (individual e em massa) e exclusão de registros de análise, integrando com o motor de status do servidor.
 */

import { RcaRecord } from "../../types";
import { API_BASE, checkResponse } from "./base";
import { fetchActions } from "./actions";
import { logger } from "../../utils/logger";

// --- ANÁLISES (RCAs) ---

export const fetchRecords = async (): Promise<RcaRecord[]> => {
    logger.info('API: Buscando lista resumida de análises...');
    const response = await fetch(`${API_BASE}/rcas`);
    return checkResponse<RcaRecord[]>(response, 'GET /rcas');
};

export const fetchAllRecordsFull = async (): Promise<RcaRecord[]> => {
    logger.info('API: Buscando carga completa de análises (Backup)...');
    const response = await fetch(`${API_BASE}/rcas?full=true`);
    return checkResponse<RcaRecord[]>(response, 'GET /rcas?full=true');
};

export const fetchRecordById = async (id: string): Promise<RcaRecord | null> => {
    try {
        const response = await fetch(`${API_BASE}/rcas/${id}`);
        if (response.status === 404) return null;
        return await checkResponse<RcaRecord>(response, `GET /rcas/${id}`);
    } catch {
        return null;
    }
};

export const saveRecordToApi = async (record: RcaRecord, isUpdate?: boolean): Promise<void> => {
    logger.info('API: Persistindo análise:', record.id);

    // Se o chamador explicitamente disse que é um update ou criação, respeitamos para evitar 404 no console
    if (isUpdate === true) {
        const response = await fetch(`${API_BASE}/rcas/${record.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        await checkResponse<void>(response, `PUT /rcas/${record.id}`);
        return;
    }

    if (isUpdate === false) {
        const response = await fetch(`${API_BASE}/rcas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        await checkResponse<void>(response, 'POST /rcas');
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
            await checkResponse<void>(response, `PUT /rcas/${record.id}`);
            return;
        }

        if (response.status === 404) {
            const createResponse = await fetch(`${API_BASE}/rcas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });
            await checkResponse<void>(createResponse, 'POST /rcas');
            return;
        }

        await checkResponse<void>(response, `PUT /rcas/${record.id}`);
    } catch (error) {
        throw error;
    }
};

export const deleteRecordFromApi = async (id: string): Promise<void> => {
    logger.info('API: Excluindo análise:', id);
    const response = await fetch(`${API_BASE}/rcas/${id}`, { method: 'DELETE' });
    await checkResponse<void>(response, `DELETE /rcas/${id}`);
    logger.info('API: Análise excluída com sucesso:', id);
};

export const importRecordsToApi = async (records: RcaRecord[]): Promise<void> => {
    logger.info('API: Importando análises com contexto de planos de ação...', records.length);

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
    await checkResponse<void>(response, 'POST /rcas/bulk (Importação CSV)');
};

