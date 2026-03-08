import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, AlertTriangle, Check, Copy, RefreshCw, MessageSquare, History, BrainCircuit, Send, Zap, Trash2 } from 'lucide-react';
import { RcaRecord } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';
import { useAi } from '../../context/AIContext';
import { Button } from '../ui/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mermaid } from '../ui/Mermaid';
import { SuggestionChips } from './SuggestionChips';
import { getSuggestionsForContext } from './aiSuggestionsLogic';
import './AiSidebar.css';

interface AiSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onOpen?: () => void;
    rcaData: RcaRecord;
    onApplySuggestion?: (suggestion: string) => void;
}

// Componente para renderizar blocos de código
const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : '';
    const content = String(children).replace(/\n$/, '');

    if (!inline && lang === 'mermaid') {
        return <Mermaid chart={content} />;
    }

    return (
        <code className={className} {...props}>
            {children}
        </code>
    );
};

export const AiSidebar: React.FC<AiSidebarProps> = ({ isOpen, onClose, onOpen, rcaData, onApplySuggestion }) => {
    const { t } = useLanguage();
    const { status, messages, insight, reasoning, recurrences, error, analyzeRca, chatWithAi, clearAi, loadHistory } = useAi();
    const [chatInput, setChatInput] = useState('');
    const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
    const [width, setWidth] = useState(750);
    const [isResizing, setIsResizing] = useState(false);
    const contentEndRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Resize Logic
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 400 && newWidth < window.innerWidth * 0.8) {
                setWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    // Auto-scroll durante o streaming ou novas mensagens
    useEffect(() => {
        if (contentEndRef.current) {
            contentEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [insight, reasoning, messages.length]);

    // Carrega o histórico ao abrir a aba
    useEffect(() => {
        const initChat = async () => {
            if (isOpen && !hasLoadedHistory && rcaData.id) {
                // Aguarda o React montar e carrega a persistência do Agno (SQLite)
                await loadHistory(rcaData.id);
                setHasLoadedHistory(true);
            }
        };
        initChat();
    }, [isOpen, rcaData.id, hasLoadedHistory, loadHistory]);

    // Dispara análise inicial se abrir pela primeira vez, não tiver histórico e tiver dados
    useEffect(() => {
        if (isOpen && hasLoadedHistory && messages.length === 0 && status === 'idle' && (rcaData.what || rcaData.problem_description)) {
            const timer = setTimeout(() => analyzeRca(rcaData), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, hasLoadedHistory, messages.length, status, rcaData, analyzeRca]);

    const handleSend = (text?: string) => {
        const messageToSend = text || chatInput;
        if (!messageToSend.trim() || status === 'thinking' || status === 'streaming') return;
        chatWithAi(rcaData, messageToSend);
        if (!text) setChatInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getContextualSuggestions = (): string[] => {
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
        return getSuggestionsForContext({
            messageCount: messages.length,
            lastMessageContent: lastMsg?.content,
            lastMessageRole: lastMsg?.role,
            hasRecurrences: recurrences.length > 0,
            t
        });
    };

    const markdownComponents = {
        code: CodeBlock
    };

    return (
        <div
            ref={sidebarRef}
            className={`ai-sidebar ${isOpen ? 'open' : 'minimized'} ${isResizing ? 'resizing' : ''}`}
            style={{ width: isOpen ? `${width}px` : undefined }}
            onClick={() => !isOpen && onOpen?.()}
        >
            {isOpen && (
                <div 
                    className="ai-sidebar-resizer" 
                    onMouseDown={startResizing}
                />
            )}
            
            <header className="ai-sidebar-header">
                <div className="ai-sidebar-title">
                    <BrainCircuit size={24} />
                    <span>{t('ai.copilotTitle')}</span>
                </div>
                <div className="flex items-center gap-1">
                    {messages.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); clearAi(rcaData.id); }}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/70 hover:text-white"
                            title={t('ai.clearChat')}
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
                            <History size={14} /> {t('ai.similarHistory')} ({recurrences.length})
                        </h4>
                        <div className="ai-recurrence-list">
                            {recurrences.map((r, i) => (
                                <div key={i} className="ai-recurrence-card">
                                    <div className="flex justify-between items-start">
                                        <span className="ai-rca-id">#{r.rca_id.substring(0, 8)}...</span>
                                        <span className="ai-match-badge">
                                            {Math.round(r.similarity * 100)}% {t('ai.match')}
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
                        <Sparkles size={14} className="text-blue-500" /> {t('ai.chatConversations')}
                    </h4>

                    <div className="ai-messages-container">
                        {/* Histórico Persistente */}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`ai-message ${msg.role}`}>
                                <div className="ai-avatar">
                                    {msg.role === 'assistant' ? <BrainCircuit size={16} /> : <Zap size={16} />}
                                </div>
                                <div className="ai-bubble">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownComponents}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                    {msg.role === 'assistant' && onApplySuggestion && (
                                        <button
                                            className="ai-apply-btn"
                                            onClick={() => onApplySuggestion(msg.content)}
                                            title={t('ai.applyToForm')}
                                        >
                                            <Check size={14} /> {t('ai.apply')}
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
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownComponents}
                                    >
                                        {insight}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {/* Reasoning Streaming / Thinking */}
                        {(status === 'thinking' || reasoning) && !insight && (
                            <div className="ai-thinking">
                                <RefreshCw size={32} className="animate-spin text-blue-500" />
                                <div className="ai-thinking-text">
                                    <p>{reasoning ? 'Processando raciocínio...' : t('ai.thinking')}</p>
                                    {reasoning && <span className="ai-reasoning-detail text-sm text-gray-400 block mt-1">{reasoning}</span>}
                                </div>
                            </div>
                        )}

                        {messages.length === 0 && !insight && status === 'idle' && (
                            <div className="ai-empty-chat">
                                <Zap size={32} />
                                <p>{t('ai.welcome')}</p>
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
                <SuggestionChips 
                    suggestions={getContextualSuggestions()}
                    onSuggestionClick={(text) => handleSend(text)}
                    visible={(status === 'idle' || status === 'done' || status === 'error') && !insight}
                />

                <div className="ai-input-container">
                    <textarea
                        className="ai-chat-input"
                        placeholder={t('ai.inputPlaceholder')}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                    />
                    <button
                        className="ai-send-button"
                        onClick={() => handleSend()}
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
                        {t('ai.reanalyze')}
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(insight)}
                        disabled={!insight}
                    >
                        {t('ai.copyReport')}
                    </Button>
                </div>
            </footer>
        </div>
    );
};

