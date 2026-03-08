/**
 * Teste: AiSuggestionsLogic.test.ts
 * 
 * Proposta: Validar a lógica de geração de sugestões contextuais.
 * Ações: Verifica se as sugestões retornadas mudam conforme o histórico de mensagens.
 */

import { describe, it, expect } from 'vitest';
import { getSuggestionsForContext, SuggestionContext } from '../aiSuggestionsLogic';

describe('AI Suggestions Logic', () => {
    const mockT = (key: string) => key;

    it('deve retornar sugestões iniciais quando não há mensagens', () => {
        const ctx: SuggestionContext = {
            messageCount: 0,
            t: mockT,
            hasRecurrences: false
        };

        const suggestions = getSuggestionsForContext(ctx);
        expect(suggestions).toContain('ai.suggestions.initial.analyze');
        expect(suggestions).toContain('ai.suggestions.initial.ishikawa');
    });

    it('deve priorizar histórico nas sugestões iniciais se houver recorrências', () => {
        const ctx: SuggestionContext = {
            messageCount: 0,
            t: mockT,
            hasRecurrences: true
        };

        const suggestions = getSuggestionsForContext(ctx);
        expect(suggestions).toContain('ai.suggestions.initial.history');
    });

    it('deve retornar sugestões de registro quando a causa raiz é mencionada pelo assistente', () => {
        const ctx: SuggestionContext = {
            messageCount: 2,
            lastMessageContent: 'Identificamos que a causa raiz foi a falha de lubrificação.',
            lastMessageRole: 'assistant',
            t: mockT
        };

        const suggestions = getSuggestionsForContext(ctx);
        expect(suggestions).toContain('ai.suggestions.postRootCause.register');
    });

    it('não deve retornar sugestões de registro se o usuário mencionar causa raiz (IA ainda não confirmou)', () => {
        const ctx: SuggestionContext = {
            messageCount: 1,
            lastMessageContent: 'Eu acho que a causa raiz é o rolamento.',
            lastMessageRole: 'user',
            t: mockT
        };

        const suggestions = getSuggestionsForContext(ctx);
        expect(suggestions).not.toContain('ai.suggestions.postRootCause.register');
        expect(suggestions).toContain('ai.suggestions.postAnalysis.fiveWhys');
    });
});
