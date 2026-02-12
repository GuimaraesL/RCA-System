/**
 * Proposta: Componente de entrada de texto longo (Textarea) padronizado.
 * Fluxo: Renderiza um campo multi-linha com suporte a rótulos, indicação de obrigatoriedade e feedback visual de erro.
 */

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, required, className = '', ...props }) => {
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
            <textarea
                {...props}
                value={props.value ?? ''}
                className={`
                    w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all outline-none resize-none placeholder-slate-400
                    ${error
                        ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}
                    ${props.disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'text-slate-900'}
                    ${className}
                `}
            />
        </div>
    );
};
