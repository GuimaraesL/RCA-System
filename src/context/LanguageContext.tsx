/**
 * Proposta: Contexto de internacionalização (i18n) e localização.
 * Fluxo: Gerencia o idioma ativo, provê a função de tradução (t) com suporte a dot-notation e normalização de chaves, e formata datas conforme a localidade.
 */

import React, { useState, ReactNode } from 'react';
import { TranslationSchema } from '../i18n/types';
import { pt } from '../i18n/locales/pt';
import { en } from '../i18n/locales/en';
import { Language, LanguageContext } from './LanguageDefinition';
import { safeGetItem, safeSetItem } from '../services/storageService';

const dictionaries: Record<Language, TranslationSchema> = { pt, en };

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Inicializa a partir do localStorage ou define 'pt' como padrão de segurança
    const [language, setLanguageState] = useState<Language>(() => {
        const NEW_KEY = 'rca_app_v1_pref_language';
        const LEGACY_KEY = 'rca-language';

        // 1. Tenta buscar pela nova chave (que já é salva como JSON string)
        const savedNew = safeGetItem<string>(NEW_KEY);
        if (savedNew && (savedNew === 'pt' || savedNew === 'en')) return savedNew as Language;

        // 2. Tenta buscar pela chave antiga (Texto puro, não JSON)
        try {
            const savedLegacy = localStorage.getItem(LEGACY_KEY);
            if (savedLegacy && (savedLegacy === 'pt' || savedLegacy === 'en')) {
                // Migra para o novo padrão
                safeSetItem(NEW_KEY, savedLegacy);
                localStorage.removeItem(LEGACY_KEY);
                return savedLegacy as Language;
            }
        } catch (e) {
            console.warn('Erro ao ler preferência de idioma legada', e);
        }

        return 'pt';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        safeSetItem('rca_app_v1_pref_language', lang);
    };

    const locale = dictionaries[language];

    /**
     * Função de tradução principal.
     * Implementa busca recursiva por chaves (ex: "dashboard.title") e normalização agressiva
     * para garantir a compatibilidade com strings legadas ou com ruído de espaços.
     */
    const t = (key: string): string => {
        if (!key) return '';

        const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/\u2026/g, '...');
        const cleanKey = normalize(key);

        // 1. Busca em mapeamentos estáticos conhecidos (Checklist e HRA) com normalização
        const checklistMapping = locale.checklists?.precision as Record<string, string>;
        if (checklistMapping) {
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

        // 2. Busca recursiva via dot-notation
        let translation = lookup(key, locale);
        if (translation) return translation;

        // 3. Fallback para chaves diretas no nível raiz do dicionário
        if (!key.includes('.')) {
            const rootFound = Object.keys(locale).find(k => normalize(k) === cleanKey);
            if (rootFound) return (locale as any)[rootFound];
        }

        return key;
    };

    /**
     * Formata datas utilizando a API nativa Intl conforme o idioma selecionado.
     */
    const formatDate = (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
        if (!date) return '-';
        try {
            const d = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(d.getTime())) return '-';

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