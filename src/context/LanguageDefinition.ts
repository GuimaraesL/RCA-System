/**
 * Proposta: Definições de tipos e interfaces para o sistema de internacionalização (i18n).
 * Fluxo: Provê o contrato base para o contexto de idioma, definindo os tipos suportados e a estrutura da função de tradução.
 */

import { createContext, useContext } from 'react';
import { TranslationSchema } from '../i18n/types';

export type Language = 'pt' | 'en';

export interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    locale: TranslationSchema;
    formatDate: (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
