/**
 * Proposta: Componente de input padrão com suporte a estados de erro e acessibilidade.
 */

import React, { InputHTMLAttributes } from 'react';
import { useLanguage } from '../../context/LanguageDefinition';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
    id: string; // Obrigatório para garantir a acessibilidade via label/id
    label?: string;
    error?: boolean;
}

export const Input: React.FC<InputProps> = ({ id, label, error, className, value, ...props }) => {
    const { t } = useLanguage();
    
    // Normalização: Converte valores nulos/indefinidos em string vazia para evitar alertas de componente não-controlado do React
    const safeValue = value ?? '';

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-slate-500 mb-1">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                id={id}
                name={id}
                value={safeValue}
                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-all ${error
                    ? 'border-red-500 ring-2 ring-red-50 focus:border-red-600 focus:ring-red-100'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    } ${className || ''}`}
                {...props}
            />
            {error && <span className="text-[10px] text-red-500 font-medium mt-0.5 block animate-in fade-in slide-in-from-top-1">{t('common.requiredField')}</span>}
        </div>
    );
};