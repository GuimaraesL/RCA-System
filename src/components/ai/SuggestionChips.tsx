/**
 * Proposta: Chips de sugestões contextuais para o chat da IA.
 * Fluxo: Exibe botões clicáveis com perguntas ou ações sugeridas baseadas no estado da conversa.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';

interface SuggestionChipsProps {
    suggestions: string[];
    onSuggestionClick: (suggestion: string) => void;
    visible: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ 
    suggestions, 
    onSuggestionClick, 
    visible 
}) => {
    if (!visible || suggestions.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {suggestions.map((suggestion, index) => (
                <button
                    key={index}
                    onClick={() => onSuggestionClick(suggestion)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/30 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm active:scale-95 group"
                >
                    <Sparkles size={12} className="text-blue-500 group-hover:animate-pulse" />
                    {suggestion}
                </button>
            ))}
        </div>
    );
};
