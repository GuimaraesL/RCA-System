/**
 * Proposta: Utilitário de log centralizado para o frontend.
 * Fluxo: Filtra logs baseando-se no ambiente (Vite PROD/DEV) para evitar vazamento de informações em produção.
 */

const isProd = import.meta.env.PROD;

export const logger = {
    info: (...args: any[]) => {
        if (!isProd) {
            console.log('[INFO]', ...args);
        }
    },
    warn: (...args: any[]) => {
        if (!isProd) {
            console.warn('[WARN]', ...args);
        }
    },
    error: (...args: any[]) => {
        // Erros são logados mesmo em produção para auxílio em debugging via console de ferramentas de monitoramento,
        // mas com um prefixo claro.
        console.error('[ERROR]', ...args);
    }
};
