/**
 * Proposta: Modal de confirmação genérico e estilizado.
 * Fluxo: Substitui o uso de window.confirm() (que é bloqueado em ambientes corporativos restritos), provendo uma interface acessível, animada e com suporte a diferentes variantes de severidade (Perigo, Alerta, Info).
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { animateModalEnter } from '../../services/animations';
import { useLanguage } from '../../context/LanguageDefinition';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    variant = 'danger'
}) => {
    const { t } = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);

    const finalTitle = title || t('common.confirm');
    const finalConfirmText = confirmText || t('common.confirm');
    const finalCancelText = cancelText || t('common.cancel');

    useEffect(() => {
        if (isOpen && containerRef.current) {
            animateModalEnter(containerRef.current);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const variantColors = {
        danger: {
            bg: 'bg-red-50',
            icon: 'text-red-500',
            button: 'bg-red-600 hover:bg-red-700'
        },
        warning: {
            bg: 'bg-yellow-50',
            icon: 'text-yellow-500',
            button: 'bg-yellow-600 hover:bg-yellow-700'
        },
        info: {
            bg: 'bg-blue-50',
            icon: 'text-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700'
        }
    };

    const colors = variantColors[variant];

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div
                ref={containerRef}
                className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 ${(window as any).isPlaywright ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Cabeçalho */}
                <div className={`px-8 py-6 ${colors.bg} flex items-center gap-4 border-b border-slate-100`}>
                    <div className={`p-2.5 rounded-xl bg-white shadow-sm ${colors.icon}`}>
                        <AlertTriangle size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 font-display tracking-tight">{finalTitle}</h3>
                    <button
                        onClick={onCancel}
                        className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Corpo da Mensagem */}
                <div className="p-8">
                    <p className="text-slate-600 font-medium leading-relaxed">{message}</p>
                </div>

                {/* Ações de Rodapé */}
                <div className="px-8 py-6 bg-slate-50 flex justify-end gap-4 border-t border-slate-100">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 text-slate-500 font-bold rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200"
                    >
                        {finalCancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-8 py-2.5 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 ${colors.button}`}
                    >
                        {finalConfirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
