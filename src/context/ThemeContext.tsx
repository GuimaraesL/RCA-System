/**
 * Proposta: Contexto de tema (Dark/Light) para a aplicação.
 * Fluxo: Gerencia o estado global do tema, persiste a preferência no localStorage,
 * detecta a preferência do sistema operacional (prefers-color-scheme) e aplica a
 * classe 'dark' no elemento <html> para ativar as variantes CSS.
 *
 * Issue: #42 - Suporte a temas Dark e Light.
 */

import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { safeGetItem, safeSetItem } from '../services/storageService';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'rca_app_v1_pref_theme';

const getSystemPreference = (): boolean =>
    window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveIsDark = (mode: ThemeMode): boolean =>
    mode === 'dark' || (mode === 'system' && getSystemPreference());

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        const saved = safeGetItem<ThemeMode>(STORAGE_KEY);
        if (saved && ['light', 'dark', 'system'].includes(saved)) return saved;
        return 'light';
    });

    const [isDark, setIsDark] = useState(() => resolveIsDark(theme));

    const applyTheme = useCallback((dark: boolean) => {
        const root = document.documentElement;
        if (dark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        setIsDark(dark);
    }, []);

    const setTheme = useCallback((newTheme: ThemeMode) => {
        setThemeState(newTheme);
        safeSetItem(STORAGE_KEY, newTheme);
        applyTheme(resolveIsDark(newTheme));
    }, [applyTheme]);

    // Aplica o tema na montagem inicial
    useEffect(() => {
        applyTheme(resolveIsDark(theme));
    }, [applyTheme, theme]);

    // Escuta mudanças na preferência do sistema (quando modo = 'system')
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme, applyTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
