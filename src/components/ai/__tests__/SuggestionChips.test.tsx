/**
 * Teste: SuggestionChips.test.tsx
 * 
 * Proposta: Validar o componente de chips de sugestão do chat da IA.
 * Ações: Verifica renderização, clique em sugestões e visibilidade baseada em props.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionChips } from '../SuggestionChips';
import React from 'react';

// Mock do contexto de linguagem
vi.mock('../../../context/LanguageDefinition', () => ({
    useLanguage: () => ({
        t: (key: string) => key
    })
}));

describe('SuggestionChips Component', () => {
    const suggestions = ['Sugestão 1', 'Sugestão 2'];
    const onSuggestionClick = vi.fn();

    it('deve renderizar a lista de sugestões corretamente', () => {
        render(
            <SuggestionChips 
                suggestions={suggestions} 
                onSuggestionClick={onSuggestionClick} 
                visible={true} 
            />
        );

        expect(screen.getByText('Sugestão 1')).toBeTruthy();
        expect(screen.getByText('Sugestão 2')).toBeTruthy();
    });

    it('não deve renderizar nada se visible for false', () => {
        const { container } = render(
            <SuggestionChips 
                suggestions={suggestions} 
                onSuggestionClick={onSuggestionClick} 
                visible={false} 
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('deve disparar o evento onSuggestionClick ao clicar em um chip', () => {
        render(
            <SuggestionChips 
                suggestions={suggestions} 
                onSuggestionClick={onSuggestionClick} 
                visible={true} 
            />
        );

        fireEvent.click(screen.getByText('Sugestão 1'));
        expect(onSuggestionClick).toHaveBeenCalledWith('Sugestão 1');
    });

    it('não deve renderizar nada se a lista de sugestões estiver vazia', () => {
        const { container } = render(
            <SuggestionChips 
                suggestions={[]} 
                onSuggestionClick={onSuggestionClick} 
                visible={true} 
            />
        );

        expect(container.firstChild).toBeNull();
    });
});
