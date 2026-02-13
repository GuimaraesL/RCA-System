
/**
 * Proposta: Utilitários base e configuração de comunicação HTTP.
 * Fluxo: Define o endpoint raiz e funções de tratamento de resposta compartilhadas.
 */

export const API_BASE = 'http://localhost:3001/api';

/**
 * Helper para verificar a integridade da resposta HTTP e lançar erros descritivos.
 */
export const checkResponse = async (response: Response, operation: string): Promise<any> => {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error(`❌ Erro na API [${operation}]:`, response.status, errorBody);
        const details = errorBody.details
            ? ` (${JSON.stringify(errorBody.details)})`
            : '';
        throw new Error((errorBody.error || `HTTP ${response.status}`) + details);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

/**
 * Gera um ID único para operações que ocorrem client-side durante importações.
 */
export const generateId = (prefix: string = 'GEN'): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
};
