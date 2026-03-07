/**
 * Proposta: Componente Modal genérico e estilizado.
 * Fluxo: Fornece um contêiner padronizado para janelas sobrepostas, com suporte a cabeçalho, corpo e rodapé customizados.
 */

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
    icon?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidth = 'max-w-4xl',
    icon
}) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full ${maxWidth} overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]`}
            >
                {/* Cabeçalho */}
                <div className="px-8 py-6 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    {icon && (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400">
                            {icon}
                        </div>
                    )}
                    <h3 className="font-black text-xl text-slate-900 dark:text-white font-display tracking-tight flex-1">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Corpo (Scrollable) */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>

                {/* Rodapé */}
                {footer && (
                    <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
