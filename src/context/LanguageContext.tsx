import React, { useState, ReactNode } from 'react';
import { TranslationSchema } from '../i18n/types';
import { pt } from '../i18n/locales/pt';
import { en } from '../i18n/locales/en';
import { Language, LanguageContext } from './LanguageDefinition';

const dictionaries: Record<Language, TranslationSchema> = { pt, en };

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Load from localStorage or default to browser language or 'pt'
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('rca-language');
        if (saved && (saved === 'pt' || saved === 'en')) return saved as Language;
        return 'pt';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('rca-language', lang);
    };

    const locale = dictionaries[language];

    // Recursive key lookup for dot notation e.g. "dashboard.title"
    const t = (key: string): string => {
        const keys = key.split('.');
        let current: any = locale;

        for (const k of keys) {
            if (!current || current[k] === undefined) {
                // Only warn if it looks like a dot-notation key
                if (key.includes('.')) {
                    console.warn(`Translation missing for key: ${key} in language: ${language}`);
                }
                return key;
            }
            current = current[k];
        }

        return typeof current === 'string' ? current : key;
    };

    const formatDate = (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
        if (!date) return '-';
        try {
            const d = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(d.getTime())) return '-';

            // 'pt-BR' or 'en-US'
            const intlLocale = language === 'pt' ? 'pt-BR' : 'en-US';

            const defaultOptions: Intl.DateTimeFormatOptions = {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            };

            return new Intl.DateTimeFormat(intlLocale, options || defaultOptions).format(d);
        } catch {
            return '-';
        }
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, locale, formatDate }}>
            {children}
        </LanguageContext.Provider>
    );
};
