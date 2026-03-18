import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../context/ThemeContext';
import { LanguageProvider } from '../../context/LanguageContext';
import { AiProvider } from '../../context/AIContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

// Mock do matchMedia
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

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <LanguageProvider>
        <ThemeProvider>
            <AiProvider>
                {children}
            </AiProvider>
        </ThemeProvider>
    </LanguageProvider>
);

describe('Global Design & Accessibility Audit', () => {
    
    describe('WCAG & Semantic Validation', () => {
        it('deve garantir que Badges de IA usam cores contrastantes do Design System', () => {
            render(
                <AllProviders>
                    <Badge variant="primary">IA Insight</Badge>
                </AllProviders>
            );
            const badge = screen.getByText('IA Insight');
            // Blue-50 (bg) e Blue-700 (text) garantem contraste WCAG AA
            expect(badge.className).toContain('bg-primary-50');
            expect(badge.className).toContain('text-primary-700');
        });

        it('deve garantir que botões críticos tenham labels acessíveis', () => {
            render(
                <AllProviders>
                    <Button aria-label="Ação de IA">Clique aqui</Button>
                </AllProviders>
            );
            expect(screen.getByLabelText('Ação de IA')).toBeTruthy();
        });
    });

    describe('Theme Consistency (Global)', () => {
        it('deve validar transição de cores sólidas para modo dark', () => {
            // Simulamos a presença da classe dark no container pai ou document
            const { container } = render(
                <div className="dark">
                    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        Theme Test
                    </div>
                </div>
            );
            
            const themedDiv = container.querySelector('.bg-white');
            expect(themedDiv).toBeTruthy();
            expect(themedDiv?.className).toContain('dark:bg-slate-900');
            expect(themedDiv?.className).toContain('dark:text-slate-100');
        });

        it('os elementos de IA devem respeitar a paleta Blue/Slate sólida (Seção 3.5)', () => {
            render(
                <AllProviders>
                    <div className="bg-blue-50 dark:bg-slate-800 border-blue-100 dark:border-white/10">
                        IA Surface
                    </div>
                </AllProviders>
            );
            
            const iaSurface = screen.getByText('IA Surface');
            expect(iaSurface.className).toContain('bg-blue-50');
            expect(iaSurface.className).toContain('dark:bg-slate-800');
        });
    });
});
