import React, { createContext, useContext, useState, useCallback } from 'react';
import { RcaRecord } from '../types';
import { streamAiAnalysis, StreamUpdate } from '../services/aiStreamingService';

interface AiContextType {
    isAiOpen: boolean;
    setAiOpen: (open: boolean) => void;
    status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error';
    insight: string;
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
    const [insight, setInsight] = useState('');
    const [recurrences, setRecurrences] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const clearAi = useCallback(() => {
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
            } else if (update.type === 'error') {
                setStatus('error');
                setError(update.text || 'Erro inesperado.');
            }
        });
    }, [status]);

    const chatWithAi = useCallback(async (rca: RcaRecord, message: string) => {
        if (status === 'streaming' || status === 'thinking') return;

        setStatus('thinking');
        setError(null);
        // O insight do chat substitui ou concatena conforme a lógica.
        // Aqui vamos apenas disparar a análise com a mensagem como contexto.
        await streamAiAnalysis(rca, (update: StreamUpdate) => {
            if (update.type === 'content' && update.text) {
                setStatus('streaming');
                setInsight(update.text);
            } else if (update.type === 'done') {
                setStatus('done');
            } else if (update.type === 'error') {
                setStatus('error');
                setError(update.text || 'Erro no chat.');
            }
        }, message);
    }, [status]);

    return (
        <AiContext.Provider value={{
            isAiOpen, setAiOpen, status, insight, recurrences, error, analyzeRca, chatWithAi, clearAi
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
