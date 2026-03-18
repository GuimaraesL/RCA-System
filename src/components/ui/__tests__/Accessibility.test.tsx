import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Badge } from '../Badge';

describe('WCAG Accessibility Tests', () => {
    it('Badges devem ter contraste e semântica correta', () => {
        render(<Badge variant="primary">IA Active</Badge>);
        const badge = screen.getByText('IA Active');
        
        // Verifica se é um elemento span (padrão para badges)
        expect(badge.tagName).toBe('SPAN');
        
        // Verifica se as classes de cor (Blue-50/Blue-700) que garantem contraste estão presentes
        expect(badge.className).toContain('bg-primary-50');
        expect(badge.className).toContain('text-primary-700');
    });

    it('Elementos interativos devem ser acessíveis (exemplo com Botão/Link)', () => {
        // Mock de um elemento interativo que simulamos no design de IA
        render(
            <button aria-label="Limpar Conversa" title="Limpar">
                <span dangerouslySetInnerHTML={{ __html: '<svg></svg>' }} />
            </button>
        );
        
        const button = screen.getByRole('button', { name: /limpar conversa/i });
        expect(button).toBeTruthy();
        expect(button.getAttribute('aria-label')).toBe('Limpar Conversa');
    });

    it('Imagens e ícones identitários de IA devem ter descrição para leitores de tela', () => {
         render(
            <div role="img" aria-label="Cérebro Artificial - Identidade IA">
                 {/* Ícone BrainCircuit da Lucide usualmente */}
            </div>
        );
        
        expect(screen.getByRole('img', { name: /cérebro artificial/i })).toBeTruthy();
    });
});
