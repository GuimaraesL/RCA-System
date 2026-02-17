/**
 * Proposta: Seletor de idioma (PT/EN) para internacionalização.
 * Fluxo: Renderiza botões para alternância de localidade, persistindo a escolha no contexto global e no LocalStorage.
 */

import React from 'react';
import { useLanguage } from '../../context/LanguageDefinition';

interface LanguageSelectorProps {
    compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact }) => {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className={`flex ${compact ? 'flex-col' : 'flex-row'} items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 shadow-inner`}>
            <button
                onClick={() => setLanguage('pt')}
                className={`p-2 rounded-xl transition-all flex items-center justify-center gap-2 group ${language === 'pt'
                    ? 'bg-blue-600 shadow-lg shadow-blue-600/20 text-white font-black scale-105'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    } ${compact ? 'w-full' : 'px-4'}`}
                title={t("common.portuguese")}
            >
                <span className={`text-lg transition-transform ${language === 'pt' ? 'scale-110' : 'group-hover:scale-110'}`}>🇧🇷</span>
                {!compact && <span className="text-[10px] font-black uppercase tracking-widest">PT</span>}
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`p-2 rounded-xl transition-all flex items-center justify-center gap-2 group ${language === 'en'
                    ? 'bg-blue-600 shadow-lg shadow-blue-600/20 text-white font-black scale-105'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    } ${compact ? 'w-full' : 'px-4'}`}
                title={t("common.english")}
            >
                <span className={`text-lg transition-transform ${language === 'en' ? 'scale-110' : 'group-hover:scale-110'}`}>🇺🇸</span>
                {!compact && <span className="text-[10px] font-black uppercase tracking-widest">EN</span>}
            </button>
        </div>
    );
};
