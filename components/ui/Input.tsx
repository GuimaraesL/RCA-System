
import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-medium text-slate-500 mb-1">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-shadow ${error
                        ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                    } ${className || ''}`}
                {...props}
            />
            {error && <span className="text-[10px] text-red-500 font-medium mt-0.5 block">Campo obrigatório</span>}
        </div>
    );
};
