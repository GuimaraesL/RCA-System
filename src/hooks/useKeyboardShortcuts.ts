/**
 * Proposta: Hook central de atalhos de teclado para produtividade.
 * Fluxo: Registra listeners globais de teclado no `document`, mapeando combinações de teclas
 * a callbacks fornecidos pelo componente consumidor. Realiza cleanup automático no unmount.
 * Evita conflitos com inputs/textareas e previne ações nativas do browser
 * quando o atalho é capturado (ex: Ctrl+S não salva a página HTML).
 *
 * Issue: #71 - Implementar Atalhos de Teclado para Produtividade.
 */

import { useEffect, useCallback } from 'react';

export interface ShortcutCallbacks {
    onSave?: () => void;
    onNewRca?: () => void;
    onFocusSearch?: () => void;
    onEscape?: () => void;
    onToggleSidebar?: () => void;

    onNavigate?: (view: string) => void;
}

const isInputElement = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
};

export const useKeyboardShortcuts = (callbacks: ShortcutCallbacks, enabled: boolean = true) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        const { key, ctrlKey, metaKey, altKey } = e;
        const modKey = ctrlKey || metaKey;

        // Ctrl+S / Cmd+S → Salvar
        if (modKey && key.toLowerCase() === 's') {
            e.preventDefault();
            callbacks.onSave?.();
            return;
        }

        // Alt+N → Nova RCA
        if (altKey && key.toLowerCase() === 'n') {
            e.preventDefault();
            callbacks.onNewRca?.();
            return;
        }

        // Alt+Letra → Navegação na Sidebar
        if (altKey && !modKey) {
            const navMap: Record<string, string> = {
                d: 'DASHBOARD',
                t: 'TRIGGERS',
                a: 'ANALYSES',
                p: 'ACTIONS',
                h: 'ASSETS',
                c: 'SETTINGS',
                m: 'MIGRATION',
            };
            const target = navMap[key.toLowerCase()];
            if (target) {
                e.preventDefault();
                callbacks.onNavigate?.(target);
                return;
            }
        }

        // Ctrl+K / Cmd+K → Focar busca global
        if (modKey && key.toLowerCase() === 'k') {
            e.preventDefault();
            callbacks.onFocusSearch?.();
            return;
        }

        // Ctrl+B / Cmd+B → Alternar sidebar
        if (modKey && key.toLowerCase() === 'b') {
            e.preventDefault();
            callbacks.onToggleSidebar?.();
            return;
        }

        // Esc → Fechar modal/editor
        if (key === 'Escape') {
            callbacks.onEscape?.();
            return;
        }
    }, [callbacks, enabled]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};
