import React from 'react';
import { useLanguage } from '../context/LanguageDefinition';

interface LanguageSelectorProps {
    compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact }) => {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className={`flex ${compact ? 'flex-col' : 'flex-row'} items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200`}>
            <button
                onClick={() => setLanguage('pt')}
                className={`p-1.5 rounded-md transition-all flex items-center justify-center gap-2 ${language === 'pt'
                    ? 'bg-white shadow-sm text-blue-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                    } ${compact ? 'w-full' : ''}`}
                title={t("common.portuguese")}
            >
                <span className="text-lg">🇧🇷</span>
                {!compact && <span className="text-xs">PT</span>}
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`p-1.5 rounded-md transition-all flex items-center justify-center gap-2 ${language === 'en'
                    ? 'bg-white shadow-sm text-blue-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                    } ${compact ? 'w-full' : ''}`}
                title={t("common.english")}
            >
                <span className="text-lg">🇺🇸</span>
                {!compact && <span className="text-xs">EN</span>}
            </button>
        </div>
    );
};
