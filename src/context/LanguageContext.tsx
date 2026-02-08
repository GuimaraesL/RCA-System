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
        if (!key) return '';

        // Normalização agressiva para lidar com lixo do banco de dados (espaços duplos, invisíveis, etc)
        const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/\u2026/g, '...');
        const cleanKey = normalize(key);

        // 1. Tenta correspondência exata em locais conhecidos (Checklist/HRA) com normalização
        const checklistMapping = locale.checklists?.precision as Record<string, string>;
        if (checklistMapping) {
            // Procura normalizando as chaves do dicionário também
            const found = Object.keys(checklistMapping).find(k => normalize(k) === cleanKey);
            if (found) return checklistMapping[found];
        }

        const hraMapping = locale.wizard?.stepHRA as Record<string, string>;
        if (hraMapping) {
            const found = Object.keys(hraMapping).find(k => normalize(k) === cleanKey);
            if (found) return hraMapping[found];
        }

        const lookup = (k: string, obj: any): any => {
            if (!k.includes('.')) return (obj && typeof obj[k] === 'string') ? obj[k] : undefined;
            
            const keys = k.split('.');
            let current = obj;
            for (const part of keys) {
                if (!current || current[part] === undefined) return undefined;
                current = current[part];
            }
            return typeof current === 'string' ? current : undefined;
        };

        // 2. Tenta busca por caminho (dot notation)
        let translation = lookup(key, locale);
        if (translation) return translation;

        // 3. Fallback para strings legadas no nível raiz
        if (!key.includes('.')) {
            const rootFound = Object.keys(locale).find(k => normalize(k) === cleanKey);
            if (rootFound) return (locale as any)[rootFound];
        }

        return key;
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
