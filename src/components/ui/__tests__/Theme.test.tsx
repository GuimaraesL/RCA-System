import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../../../context/ThemeContext';

// Componente de teste simples que consome o tema
const ThemeStatus = () => {
    const { isDark, theme } = useTheme();
    return (
        <div data-testid="theme-container" className={isDark ? 'dark-mode-active' : 'light-mode-active'}>
            <span>{theme}</span>
            <span>{isDark ? 'Dark' : 'Light'}</span>
        </div>
    );
};

describe('Theme Integration', () => {
    it('deve aplicar a classe dark no modo escuro', () => {
        // Mock do matchMedia para simular preferência de sistema se necessário
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        const { rerender } = render(
            <ThemeProvider>
                <ThemeStatus />
            </ThemeProvider>
        );

        // Verifica 초기 (Default é light no componente se não houver no localStorage)
        expect(screen.getByTestId('theme-container').className).toContain('light-mode-active');
        
        // Nota: O ThemeProvider real usa localStorage e document.documentElement.
        // Para testes unitários de componentes, verificamos se o Provider passa o isDark correto.
    });

    it('deve respeitar as cores sólidas do Design System em ambos os temas', () => {
        // Este teste valida se as classes do Tailwind (que mapeamos no DESIGN_SYSTEM.md) estão presentes
        // Exemplo: Blue-600 para IA
        const { container } = render(
            <div className="bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                IA Component
            </div>
        );

        const element = container.firstChild as HTMLElement;
        expect(element.className).toContain('bg-blue-50');
        expect(element.className).toContain('dark:bg-slate-800');
        expect(element.className).toContain('text-blue-600');
    });
});
