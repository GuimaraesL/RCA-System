/**
 * Proposta: Componente de entrada de texto (Input) padronizado.
 * Fluxo: Renderiza um campo de input com suporte a rótulos dinâmicos, indicação de obrigatoriedade e feedback visual de erro baseado em estado.
 */

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, error, required, className = '', ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={props.id}
                    className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-tight cursor-pointer"
                >
                    {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
                </label>
            )}
            <input
                {...props}
                value={props.value ?? ''}
                className={`
                    w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm transition-all outline-none placeholder-slate-400
                    ${error
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/10 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30'
                        : 'border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30'}
                    ${props.disabled ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'}
                    ${className}
                `}
            />
        </div>
    );
};
