import React, { createContext, useContext, useState, useCallback } from 'react';
import { RcaRecord } from '../types';
import { streamAiAnalysis, StreamUpdate, fetchChatHistory, deleteChatHistory, fetchRecurrencesOnly, fetchSavedRecurrence } from '../services/aiStreamingService';
import { useLanguage } from './LanguageDefinition';
import { RecurrenceInfo } from '../services/aiService';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface RecurrenceData {
    subgroup: RecurrenceInfo[];
    equipment: RecurrenceInfo[];
    area: RecurrenceInfo[];
    discarded: RecurrenceInfo[];
    lastAnalyzedAt?: string;
}

const EMPTY_RECURRENCE: RecurrenceData = { subgroup: [], equipment: [], area: [], discarded: [] };

interface AiContextType {
    isAiOpen: boolean;
    setAiOpen: (open: boolean) => void;
    status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error';
    messages: Message[];
    insight: string;
    reasoning: string;
    dynamicSuggestions: string[];
    recurrenceData: RecurrenceData;
    loadingRecurrences: boolean;
    error: string | null;
    analyzeRca: (rca: RcaRecord) => Promise<void>;
    chatWithAi: (rca: RcaRecord, message: string) => Promise<void>;
    loadHistory: (rcaId: string) => Promise<void>;
    loadRecurrences: (rca: RcaRecord, force?: boolean) => Promise<void>;
    clearAi: (rcaId?: string) => Promise<void>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

export const AiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { language } = useLanguage();
    const [isAiOpen, setAiOpen] = useState(false);
    const [status, setStatus] = useState<AiContextType['status']>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [insight, setInsight] = useState('');
    const [reasoning, setReasoning] = useState('');
    const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
    const [recurrenceData, setRecurrenceData] = useState<RecurrenceData>(EMPTY_RECURRENCE);
    const [loadingRecurrences, setLoadingRecurrences] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getFullLanguageName = (lang: string) => {
        if (lang === 'pt') return 'Português-BR';
        if (lang === 'en') return 'English';
        return 'Português-BR';
    };

    const clearAi = useCallback(async (rcaId?: string) => {
        if (rcaId) {
            await deleteChatHistory(rcaId);
        }
        setMessages([]);
        setInsight('');
        setReasoning('');
        setDynamicSuggestions([]);
        setRecurrenceData(EMPTY_RECURRENCE);
        setError(null);
        setStatus('idle');
    }, []);

    const loadRecurrences = useCallback(async (rca: RcaRecord, force: boolean = false) => {
        setLoadingRecurrences(true);
        try {
            // Tenta recuperar análise salva
            const saved = await fetchSavedRecurrence(rca.id);
            
            if (saved && saved.analysis && !force) {
                const data = saved.analysis;
                setRecurrenceData({
                    subgroup: data.subgroup_matches || [],
                    equipment: data.equipment_matches || [],
                    area: data.area_matches || [],
                    discarded: data.discarded_matches || [],
                    lastAnalyzedAt: saved.last_analyzed_at
                });
                setLoadingRecurrences(false);
                return;
            }

            // Só realiza nova análise se forçado (Botão Buscar)
            if (force) {
                const data = await fetchRecurrencesOnly(rca, getFullLanguageName(language));
                if (data && (data.subgroup_matches?.length || data.equipment_matches?.length || data.area_matches?.length || data.discarded_matches?.length)) {
                    setRecurrenceData({
                        subgroup: data.subgroup_matches || [],
                        equipment: data.equipment_matches || [],
                        area: data.area_matches || [],
                        discarded: data.discarded_matches || [],
                        lastAnalyzedAt: data.last_analyzed_at || new Date().toISOString()
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load recurrences', e);
        } finally {
            setLoadingRecurrences(false);
        }
    }, [language]);

    const loadHistory = useCallback(async (rcaId: string) => {
        try {
            const hist = await fetchChatHistory(rcaId);
            if (hist && hist.length > 0) {
                setMessages(hist.map((m: any) => ({
                    role: m.role,
                    content: m.content,
                    timestamp: new Date()
                })));
            }
        } catch (e) {
            console.error('Failed to load history', e);
        }
    }, []);

    const analyzeRca = useCallback(async (rca: RcaRecord) => {
        if (status === 'streaming' || status === 'thinking') return;

        setStatus('thinking');
        setError(null);
        setInsight('');
        setReasoning('');
        setDynamicSuggestions([]);
        setRecurrenceData(EMPTY_RECURRENCE);

        await streamAiAnalysis(rca, (update: StreamUpdate) => {
            if (update.type === 'content' && update.text) {
                setStatus('streaming');
                setInsight(update.text);
            } else if (update.type === 'reasoning' && update.text) {
                setReasoning(update.text);
            } else if (update.type === 'suggestions' && update.suggestions) {
                setDynamicSuggestions(update.suggestions);
            } else if (update.type === 'recurrence' && update.data) {
                // Novo formato estruturado
                if (update.data.subgroup || update.data.equipment || update.data.area || update.data.discarded) {
                    setRecurrenceData({
                        subgroup: update.data.subgroup || [],
                        equipment: update.data.equipment || [],
                        area: update.data.area || [],
                        discarded: update.data.discarded || []
                    });
                } else {
                    // Fallback legado: item individual
                    setRecurrenceData(prev => ({
                        ...prev,
                        subgroup: [...prev.subgroup, update.data]
                    }));
                }
            } else if (update.type === 'done') {
                setStatus('done');
                // Limpeza de segurança para remover tags de sugestão residuais do texto final
                const cleanContent = (update.text || '').replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim();
                setMessages(prev => [...prev, { role: 'assistant', content: cleanContent, timestamp: new Date() }]);
                setInsight('');
                setReasoning('');
            } else if (update.type === 'error') {
                setStatus('error');
                setError(update.text || 'Erro inesperado.');
            }
        }, getFullLanguageName(language));
    }, [status, language]);

    const chatWithAi = useCallback(async (rca: RcaRecord, message: string) => {
        if (status === 'streaming' || status === 'thinking') return;

        const userMsg: Message = { role: 'user', content: message, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);

        setStatus('thinking');
        setError(null);
        setInsight('');
        setReasoning('');
        setDynamicSuggestions([]);

        await streamAiAnalysis(rca, (update: StreamUpdate) => {
            if (update.type === 'content' && update.text) {
                setStatus('streaming');
                setInsight(update.text);
            } else if (update.type === 'reasoning' && update.text) {
                setReasoning(update.text);
            } else if (update.type === 'suggestions' && update.suggestions) {
                setDynamicSuggestions(update.suggestions);
            } else if (update.type === 'done') {
                setStatus('done');
                // Limpeza de segurança para remover tags de sugestão residuais do texto final
                const cleanContent = (update.text || '').replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim();
                setMessages(prev => [...prev, { role: 'assistant', content: cleanContent, timestamp: new Date() }]);
                setInsight('');
                setReasoning('');
            } else if (update.type === 'error') {
                setStatus('error');
                setError(update.text || 'Erro no chat.');
            }
        }, getFullLanguageName(language), message);
    }, [status, language]);

    return (
        <AiContext.Provider value={{
            isAiOpen, setAiOpen, status, messages, insight, reasoning, dynamicSuggestions, recurrenceData, loadingRecurrences, error, analyzeRca, chatWithAi, loadHistory, loadRecurrences, clearAi, setMessages
        }}>
            {children}
        </AiContext.Provider>
    );
};

export const useAi = () => {
    const context = useContext(AiContext);
    if (!context) throw new Error('useAi must be used within an AiProvider');
    return context;
};
