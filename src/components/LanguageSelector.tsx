import React from 'react';
import { useLanguage } from '../context/LanguageDefinition';

export const LanguageSelector: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
                onClick={() => setLanguage('pt')}
                className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${language === 'pt'
                    ? 'bg-white shadow-sm text-blue-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                title={t("common.portuguese")}
            >
                <span className="text-lg">🇧🇷</span>
                <span className="text-xs">PT</span>
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${language === 'en'
                    ? 'bg-white shadow-sm text-blue-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                title={t("common.english")}
            >
                <span className="text-lg">🇺🇸</span>
                <span className="text-xs">EN</span>
            </button>
        </div>
    );
};
