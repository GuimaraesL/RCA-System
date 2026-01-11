
import React, { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string | number; label: string }[];
    error?: boolean;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className, ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-medium text-slate-500 mb-1">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 outline-none transition-shadow ${error
                        ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/10'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                    } ${className || ''}`}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <span className="text-[10px] text-red-500 font-medium mt-0.5 block">Campo obrigatório</span>}
        </div>
    );
};
