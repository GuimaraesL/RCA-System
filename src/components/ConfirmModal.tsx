/**
 * Proposta: Modal de confirmação genérico e estilizado.
 * Fluxo: Substitui o uso de window.confirm() (que é bloqueado em ambientes corporativos restritos), provendo uma interface acessível, animada e com suporte a diferentes variantes de severidade (Perigo, Alerta, Info).
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { animateModalEnter } from '../services/animations';
import { useLanguage } from '../context/LanguageDefinition';

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
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div
                ref={containerRef}
                className={`bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden ${(window as any).isPlaywright ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Cabeçalho */}
                <div className={`px-6 py-4 ${colors.bg} flex items-center gap-3`}>
                    <AlertTriangle className={`${colors.icon}`} size={24} />
                    <h3 className="font-bold text-lg text-slate-800">{finalTitle}</h3>
                    <button
                        onClick={onCancel}
                        className="ml-auto text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Corpo da Mensagem */}
                <div className="p-6">
                    <p className="text-slate-600">{message}</p>
                </div>

                {/* Ações de Rodapé */}
                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        {finalCancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white font-bold rounded-lg ${colors.button} transition-colors`}
                    >
                        {finalConfirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};