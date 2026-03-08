/**
 * Proposta: Lógica de geração de sugestões contextuais para o chat.
 * Fluxo: Avalia o histórico de mensagens e o estado da RCA para retornar as sugestões mais relevantes.
 */

export interface SuggestionContext {
    messageCount: number;
    lastMessageContent?: string;
    lastMessageRole?: 'user' | 'assistant';
    t: (key: string) => string;
    hasRecurrences?: boolean;
}

export const getSuggestionsForContext = (ctx: SuggestionContext): string[] => {
    const { messageCount, lastMessageContent, lastMessageRole, t, hasRecurrences } = ctx;

    // 1. Estado Inicial (Sem conversa)
    if (messageCount === 0) {
        return [
            t('ai.suggestions.initial.analyze'),
            hasRecurrences ? t('ai.suggestions.initial.history') : t('ai.suggestions.initial.ishikawa'),
            t('ai.suggestions.initial.ishikawa')
        ].slice(0, 3);
    }

    // 2. Analisa o conteúdo da última mensagem (preferencialmente do assistente)
    if (lastMessageContent) {
        const content = lastMessageContent.toLowerCase();
        
        // Se já identificou a Causa Raiz
        const hasRootCause = content.includes('causa raiz') || 
                            content.includes('root cause') || 
                            content.includes('concluímos que') ||
                            content.includes('identificamos que');

        if (hasRootCause && lastMessageRole === 'assistant') {
            return [
                t('ai.suggestions.postRootCause.register'),
                t('ai.suggestions.postRootCause.suggestActions'),
                t('ai.suggestions.postRootCause.compareHistory')
            ];
        }

        // Se o assunto for Ishikawa
        if (content.includes('ishikawa') || content.includes('espinha de peixe')) {
            return [
                t('ai.suggestions.postAnalysis.fiveWhys'),
                t('ai.suggestions.postAnalysis.actionPlan'),
                t('ai.suggestions.initial.analyze')
            ];
        }

        // Se o assunto for 5 Porquês
        if (content.includes('5 porquês') || content.includes('five whys')) {
            return [
                t('ai.suggestions.initial.ishikawa'),
                t('ai.suggestions.postAnalysis.actionPlan'),
                t('ai.suggestions.postAnalysis.media')
            ];
        }
    }

    // 3. Estado Padrão (Pós-Análise Inicial ou fluxo genérico)
    return [
        t('ai.suggestions.postAnalysis.fiveWhys'),
        t('ai.suggestions.postAnalysis.actionPlan'),
        t('ai.suggestions.postAnalysis.media')
    ];
};

