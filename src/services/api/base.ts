
/**
 * Proposta: Utilitários base e configuração de comunicação HTTP.
 * Fluxo: Define o endpoint raiz e funções de tratamento de resposta compartilhadas.
 */

import { logger } from "../../utils/logger";

export const API_BASE = '/api';

/**
 * Helper para verificar a integridade da resposta HTTP e lançar erros descritivos.
 */
export const checkResponse = async <T>(response: Response, operation: string): Promise<T> => {
    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch (e) {
            errorBody = { error: 'Falha ao processar resposta do servidor' };
        }

        logger.error(`API Error [${operation}]:`, response.status, errorBody);

        const details = errorBody.details
            ? ` (${JSON.stringify(errorBody.details)})`
            : '';

        throw new Error((errorBody.error || `HTTP ${response.status}`) + details);
    }

    const text = await response.text();
    if (!text) return null as unknown as T;

    try {
        return JSON.parse(text) as T;
    } catch (e) {
        logger.error(`JSON Parse Error [${operation}]:`, text);
        throw new Error('Resposta do servidor em formato inválido');
    }
};

/**
 * Gera um ID único para operações que ocorrem client-side durante importações.
 */
export const generateId = (prefix: string = 'GEN'): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
};

/**
 * Prefixos padrão para cada tipo de taxonomia no sistema.
 */
export const TAXONOMY_PREFIXES = {
    analysisTypes: 'TYP',
    analysisStatuses: 'STA',
    triggerStatuses: 'TRG',
    componentTypes: 'CMP',
    specialties: 'SPC',
    failureModes: 'MOD',
    failureCategories: 'CAT',
    rootCauseMs: 'RCM'
};

/**
 * Verifica se um ID segue o padrão técnico do sistema (PREFIX-TIMESTAMP-RANDOM).
 */
export const isStandardId = (id: string, prefix: string): boolean => {
    if (!id || !prefix) return false;
    
    // Padrão novo: PREFIX-TIMESTAMP-RANDOM (ex: SPC-K1L2...)
    if (id.startsWith(`${prefix}-`) && id.split('-').length >= 3) return true;

    // --- PADRÕES LEGADOS DO SISTEMA (Preservar para compatibilidade com constantes) ---
    if (id.startsWith('STATUS-')) return true;     // Lógica de Análises
    if (id.startsWith('T-STATUS-')) return true;   // Lógica de Gatilhos
    if (/^M\d$/.test(id)) return true;             // Lógica de 6M (M1, M2...)
    
    return false;
};
