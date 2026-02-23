import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, AlertTriangle, Check, Copy, RefreshCw, MessageSquare, History, BrainCircuit, Send, Zap } from 'lucide-react';
import { RcaRecord } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';
import { useAi } from '../../context/AIContext';
import { Button } from '../ui/Button';
import ReactMarkdown from 'react-markdown';
import './AiSidebar.css';

interface AiSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    rcaData: RcaRecord;
}

export const AiSidebar: React.FC<AiSidebarProps> = ({ isOpen, onClose, rcaData }) => {
    const { t } = useLanguage();
    const { status, insight, recurrences, error, analyzeRca, chatWithAi } = useAi();
    const [chatInput, setChatInput] = useState('');
    const contentEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll durante o streaming ou novas mensagens
    useEffect(() => {
        if (contentEndRef.current) {
            contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [insight]);

    // Dispara análise inicial se abrir e estiver vazio
    useEffect(() => {
        if (isOpen && status === 'idle' && (rcaData.what || rcaData.problem_description)) {
            analyzeRca(rcaData);
        }
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="ai-sidebar-overlay" onClick={onClose}>
            <div className="ai-sidebar" onClick={e => e.stopPropagation()}>
                <header className="ai-sidebar-header">
                    <div className="ai-sidebar-title">
                        <BrainCircuit size={24} />
                        <span>RCA Copilot</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
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
                            {status === 'thinking' && !insight && (
                                <div className="ai-thinking">
                                    <RefreshCw size={32} className="animate-spin text-blue-500" />
                                    <p>Convocando investigadores...</p>
                                </div>
                            )}

                            {insight ? (
                                <div className={`ai-message assistant ${status === 'streaming' ? 'streaming' : ''}`}>
                                    <ReactMarkdown>{insight}</ReactMarkdown>
                                </div>
                            ) : status === 'idle' && (
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
        </div>
    );
};
