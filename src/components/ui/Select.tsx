/**
 * Proposta: Componente de seleção (Select) padronizado.
 * Fluxo: Renderiza um dropdown customizado com suporte a rótulos, indicação de obrigatoriedade e tratamento visual de erro.
 */

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
    error?: boolean;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, required, className = '', ...props }) => {
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
            <select
                {...props}
                value={props.value ?? ''}
                className={`
                    w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all outline-none cursor-pointer
                    ${error
                        ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}
                    ${props.disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'text-slate-900'}
                    ${className}
                `}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
};
