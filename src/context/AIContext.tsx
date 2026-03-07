import React, { createContext, useContext, useState, useCallback } from 'react';
import { RcaRecord } from '../types';
import { streamAiAnalysis, StreamUpdate, fetchChatHistory, deleteChatHistory } from '../services/aiStreamingService';
import { useLanguage } from './LanguageDefinition';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AiContextType {
    isAiOpen: boolean;
    setAiOpen: (open: boolean) => void;
    status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error';
    messages: Message[];
    insight: string; // Resposta corrente (streaming)
    reasoning: string; // O que a IA está pensando/fazendo no momento
    recurrences: any[];
    error: string | null;
    analyzeRca: (rca: RcaRecord) => Promise<void>;
    chatWithAi: (rca: RcaRecord, message: string) => Promise<void>;
    loadHistory: (rcaId: string) => Promise<void>;
    clearAi: (rcaId?: string) => void;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

export const AiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { language } = useLanguage();
    const [isAiOpen, setAiOpen] = useState(false);
    const [status, setStatus] = useState<AiContextType['status']>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [insight, setInsight] = useState('');
    const [reasoning, setReasoning] = useState('');
    const [recurrences, setRecurrences] = useState<any[]>([]);
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
        setRecurrences([]);
        setError(null);
        setStatus('idle');
    }, []);

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
        setRecurrences([]);

        await streamAiAnalysis(rca, (update: StreamUpdate) => {
            if (update.type === 'content' && update.text) {
                setStatus('streaming');
                setInsight(update.text);
            } else if (update.type === 'reasoning' && update.text) {
                setReasoning(update.text);
            } else if (update.type === 'recurrence' && update.data) {
                setRecurrences(prev => [...prev, update.data]);
            } else if (update.type === 'done') {
                setStatus('done');
                setMessages(prev => [...prev, { role: 'assistant', content: update.text || '', timestamp: new Date() }]);
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

        await streamAiAnalysis(rca, (update: StreamUpdate) => {
            if (update.type === 'content' && update.text) {
                setStatus('streaming');
                setInsight(update.text);
            } else if (update.type === 'reasoning' && update.text) {
                setReasoning(update.text);
            } else if (update.type === 'done') {
                setStatus('done');
                setMessages(prev => [...prev, { role: 'assistant', content: update.text || '', timestamp: new Date() }]);
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
            isAiOpen, setAiOpen, status, messages, insight, reasoning, recurrences, error, analyzeRca, chatWithAi, loadHistory, clearAi
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
