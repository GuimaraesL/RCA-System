import React, { createContext, useContext, useState, useCallback } from 'react';
import { RcaRecord } from '../types';
import { streamAiAnalysis, StreamUpdate } from '../services/aiStreamingService';

interface Message {
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
    recurrences: any[];
    error: string | null;
    analyzeRca: (rca: RcaRecord) => Promise<void>;
    chatWithAi: (rca: RcaRecord, message: string) => Promise<void>;
    clearAi: () => void;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

export const AiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAiOpen, setAiOpen] = useState(false);
    const [status, setStatus] = useState<AiContextType['status']>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [insight, setInsight] = useState('');
    const [recurrences, setRecurrences] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const clearAi = useCallback(() => {
        setMessages([]);
        setInsight('');
        setRecurrences([]);
        setError(null);
        setStatus('idle');
    }, []);

    const analyzeRca = useCallback(async (rca: RcaRecord) => {
        if (status === 'streaming' || status === 'thinking') return;

        setStatus('thinking');
        setError(null);
        setInsight('');
        setRecurrences([]);

        await streamAiAnalysis(rca, (update: StreamUpdate) => {
            if (update.type === 'content' && update.text) {
                setStatus('streaming');
                setInsight(update.text);
            } else if (update.type === 'recurrence' && update.data) {
                setRecurrences(prev => [...prev, update.data]);
            } else if (update.type === 'done') {
                setStatus('done');
                // Adiciona a resposta final ao histórico
                setMessages(prev => [...prev, { role: 'assistant', content: update.text || '', timestamp: new Date() }]);
                setInsight(''); // Limpa o buffer de streaming
            } else if (update.type === 'error') {
                setStatus('error');
                setError(update.text || 'Erro inesperado.');
            }
        });
    }, [status]);

    const chatWithAi = useCallback(async (rca: RcaRecord, message: string) => {
        if (status === 'streaming' || status === 'thinking') return;

        // Adiciona a mensagem do usuário imediatamente ao histórico
        const userMsg: Message = { role: 'user', content: message, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);

        setStatus('thinking');
        setError(null);
        setInsight('');

        await streamAiAnalysis(rca, (update: StreamUpdate) => {
            if (update.type === 'content' && update.text) {
                setStatus('streaming');
                setInsight(update.text);
            } else if (update.type === 'done') {
                setStatus('done');
                // Adiciona a resposta da IA ao histórico
                setMessages(prev => [...prev, { role: 'assistant', content: update.text || '', timestamp: new Date() }]);
                setInsight('');
            } else if (update.type === 'error') {
                setStatus('error');
                setError(update.text || 'Erro no chat.');
            }
        }, message);
    }, [status]);

    return (
        <AiContext.Provider value={{
            isAiOpen, setAiOpen, status, messages, insight, recurrences, error, analyzeRca, chatWithAi, clearAi
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
