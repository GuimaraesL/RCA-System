/**
 * Testes unitários para o hook useKeyboardShortcuts.
 * Issue: #71 - Atalhos de Teclado para Produtividade.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, ShortcutCallbacks } from './useKeyboardShortcuts';

const fireKey = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
    });
    document.dispatchEvent(event);
    return event;
};

describe('useKeyboardShortcuts', () => {
    let callbacks: Required<ShortcutCallbacks>;

    beforeEach(() => {
        callbacks = {
            onSave: vi.fn(),
            onNewRca: vi.fn(),
            onFocusSearch: vi.fn(),
            onEscape: vi.fn(),
            onToggleSidebar: vi.fn(),
            onNavigate: vi.fn(),
        };
    });

    it('Ctrl+S deve disparar onSave', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('s', { ctrlKey: true });
        expect(callbacks.onSave).toHaveBeenCalledOnce();
    });

    it('Cmd+S (Meta) deve disparar onSave', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('s', { metaKey: true });
        expect(callbacks.onSave).toHaveBeenCalledOnce();
    });

    it('Alt+N deve disparar onNewRca', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('n', { altKey: true });
        expect(callbacks.onNewRca).toHaveBeenCalledOnce();
    });

    it('Ctrl+K deve disparar onFocusSearch', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('k', { ctrlKey: true });
        expect(callbacks.onFocusSearch).toHaveBeenCalledOnce();
    });

    it('Ctrl+B deve disparar onToggleSidebar', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('b', { ctrlKey: true });
        expect(callbacks.onToggleSidebar).toHaveBeenCalledOnce();
    });

    it('Escape deve disparar onEscape', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('Escape');
        expect(callbacks.onEscape).toHaveBeenCalledOnce();
    });




    it('não deve disparar callbacks quando enabled=false', () => {
        renderHook(() => useKeyboardShortcuts(callbacks, false));
        fireKey('s', { ctrlKey: true });
        fireKey('Escape');
        expect(callbacks.onSave).not.toHaveBeenCalled();
        expect(callbacks.onEscape).not.toHaveBeenCalled();
    });

    it('tecla S sem modificador não deve disparar onSave', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('s');
        expect(callbacks.onSave).not.toHaveBeenCalled();
    });

    it('tecla N sem Alt não deve disparar onNewRca', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('n');
        expect(callbacks.onNewRca).not.toHaveBeenCalled();
    });

    it('deve limpar listeners ao desmontar', () => {
        const spy = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderHook(() => useKeyboardShortcuts(callbacks));
        unmount();
        expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
        spy.mockRestore();
    });

    // Testes de navegação Alt+Letra
    it('Alt+D deve navegar para DASHBOARD', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('d', { altKey: true });
        expect(callbacks.onNavigate).toHaveBeenCalledWith('DASHBOARD');
    });

    it('Alt+T deve navegar para TRIGGERS', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('t', { altKey: true });
        expect(callbacks.onNavigate).toHaveBeenCalledWith('TRIGGERS');
    });

    it('Alt+A deve navegar para ANALYSES', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('a', { altKey: true });
        expect(callbacks.onNavigate).toHaveBeenCalledWith('ANALYSES');
    });

    it('Alt+P deve navegar para ACTIONS', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('p', { altKey: true });
        expect(callbacks.onNavigate).toHaveBeenCalledWith('ACTIONS');
    });

    it('Alt+H deve navegar para ASSETS', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('h', { altKey: true });
        expect(callbacks.onNavigate).toHaveBeenCalledWith('ASSETS');
    });

    it('Alt+C deve navegar para SETTINGS', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('c', { altKey: true });
        expect(callbacks.onNavigate).toHaveBeenCalledWith('SETTINGS');
    });

    it('Alt+M deve navegar para MIGRATION', () => {
        renderHook(() => useKeyboardShortcuts(callbacks));
        fireKey('m', { altKey: true });
        expect(callbacks.onNavigate).toHaveBeenCalledWith('MIGRATION');
    });
});
