import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, AlertTriangle, Check, Copy, RefreshCw, MessageSquare, History, BrainCircuit, Send, Zap, Trash2 } from 'lucide-react';
import { RcaRecord } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';
import { useAi } from '../../context/AIContext';
import { Button } from '../ui/Button';
import ReactMarkdown from 'react-markdown';
import './AiSidebar.css';

interface AiSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onOpen?: () => void;
    rcaData: RcaRecord;
    onApplySuggestion?: (suggestion: string) => void;
}

export const AiSidebar: React.FC<AiSidebarProps> = ({ isOpen, onClose, onOpen, rcaData, onApplySuggestion }) => {
    const { t } = useLanguage();
    const { status, messages, insight, recurrences, error, analyzeRca, chatWithAi, clearAi } = useAi();
    const [chatInput, setChatInput] = useState('');
    const contentEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll durante o streaming ou novas mensagens
    useEffect(() => {
        if (contentEndRef.current) {
            contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [insight, messages]);

    // Dispara análise inicial se abrir pela primeira vez e tiver dados
    useEffect(() => {
        if (isOpen && messages.length === 0 && status === 'idle' && (rcaData.what || rcaData.problem_description)) {
            const timer = setTimeout(() => analyzeRca(rcaData), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, messages.length]);

    const handleSend = () => {
        if (!chatInput.trim() || status === 'thinking' || status === 'streaming') return;
        chatWithAi(rcaData, chatInput);
        setChatInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div
            className={`ai-sidebar ${isOpen ? 'open' : 'minimized'}`}
            onClick={() => !isOpen && onOpen?.()}
        >
            <header className="ai-sidebar-header">
                <div className="ai-sidebar-title">
                    <BrainCircuit size={24} />
                    <span>RCA Copilot</span>
                </div>
                <div className="flex items-center gap-1">
                    {messages.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); clearAi(); }}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/70 hover:text-white"
                            title="Limpar Chat"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="ai-glow"></div>
            </header>

            <main className="ai-sidebar-content">
                {/* Alertas de Recorrência */}
                {recurrences.length > 0 && (
                    <div className="ai-recurrence-section">
                        <h4 className="ai-section-label">
                            <History size={14} /> Histórico Similares ({recurrences.length})
                        </h4>
                        <div className="ai-recurrence-list">
                            {recurrences.map((r, i) => (
                                <div key={i} className="ai-recurrence-card">
                                    <div className="flex justify-between items-start">
                                        <span className="ai-rca-id">#{r.rca_id}</span>
                                        <span className="ai-match-badge">
                                            {Math.round(r.similarity * 100)}% Match
                                        </span>
                                    </div>
                                    <p className="ai-recurrence-title">{r.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat Section */}
                <div className="ai-chat-section">
                    <h4 className="ai-section-label">
                        <Sparkles size={14} className="text-blue-500" /> Conversa com Detectives
                    </h4>

                    <div className="ai-messages-container">
                        {/* Histórico Persistente */}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`ai-message ${msg.role}`}>
                                <div className="ai-avatar">
                                    {msg.role === 'assistant' ? <BrainCircuit size={16} /> : <Zap size={16} />}
                                </div>
                                <div className="ai-bubble">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    {msg.role === 'assistant' && onApplySuggestion && (
                                        <button
                                            className="ai-apply-btn"
                                            onClick={() => onApplySuggestion(msg.content)}
                                            title="Aplicar no formulário"
                                        >
                                            <Check size={14} /> Aplicar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Resposta em Streaming Atual */}
                        {insight && (
                            <div className="ai-message assistant streaming">
                                <div className="ai-avatar">
                                    <BrainCircuit size={16} />
                                </div>
                                <div className="ai-bubble">
                                    <ReactMarkdown>{insight}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {status === 'thinking' && !insight && (
                            <div className="ai-thinking">
                                <RefreshCw size={32} className="animate-spin text-blue-500" />
                                <p>Convocando investigadores...</p>
                            </div>
                        )}

                        {messages.length === 0 && !insight && status === 'idle' && (
                            <div className="ai-empty-chat">
                                <Zap size={32} />
                                <p>Olá! Sou seu Copilot. Como posso ajudar nesta investigação hoje?</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="ai-error-message">
                                <AlertTriangle size={18} />
                                <p>{error}</p>
                            </div>
                        )}
                        <div ref={contentEndRef} />
                    </div>
                </div>
            </main>

            <footer className="ai-sidebar-footer-chat">
                <div className="ai-input-container">
                    <textarea
                        className="ai-chat-input"
                        placeholder="Pergunte sobre modos de falha, 5 Porquês..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                    />
                    <button
                        className="ai-send-button"
                        onClick={handleSend}
                        disabled={!chatInput.trim() || status === 'thinking' || status === 'streaming'}
                    >
                        <Send size={18} />
                    </button>
                </div>

                <div className="ai-quick-actions">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => analyzeRca(rcaData)}
                        disabled={status === 'thinking' || status === 'streaming'}
                    >
                        Reanalisar Tudo
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(insight)}
                        disabled={!insight}
                    >
                        Copiar Relatório
                    </Button>
                </div>
            </footer>
        </div>
    );
};
