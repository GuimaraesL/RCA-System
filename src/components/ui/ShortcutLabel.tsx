/**
 * Proposta: Componente utilitário para renderizar labels com letra de atalho sublinhada.
 * Uso: Substitui texto plano em botões/labels, sublinhando a primeira ocorrência da letra de atalho.
 */

import React from 'react';

interface ShortcutLabelProps {
    text: string;
    shortcutLetter?: string;
}

export const ShortcutLabel: React.FC<ShortcutLabelProps> = ({ text, shortcutLetter }) => {
    if (!shortcutLetter) return <span>{text}</span>;

    const idx = text.toLowerCase().indexOf(shortcutLetter.toLowerCase());
    if (idx === -1) return <span>{text}</span>;

    return (
        <span>
            {text.slice(0, idx)}
            <span className="underline decoration-2 underline-offset-2">{text[idx]}</span>
            {text.slice(idx + 1)}
        </span>
    );
};
