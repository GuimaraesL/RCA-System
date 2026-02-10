
import React, { SelectHTMLAttributes } from 'react';
import { useLanguage } from '../../context/LanguageDefinition';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
    id: string; // Required for accessibility
    label?: string;
    options: { value: string | number; label: string }[];
    error?: boolean;
}

export const Select: React.FC<SelectProps> = ({ id, label, options, error, className, value, ...props }) => {
    const { t } = useLanguage();
    // Fix: Convert null/undefined value to empty string to avoid React warning
    const safeValue = value ?? '';

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-slate-500 mb-1">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                id={id}
                name={id}
                value={safeValue}
                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 outline-none transition-all ${error
                    ? 'border-red-500 ring-2 ring-red-50 focus:border-red-600 focus:ring-red-100'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    } ${className || ''}`}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <span className="text-[10px] text-red-500 font-medium mt-0.5 block animate-in fade-in slide-in-from-top-1">{t('common.requiredField')}</span>}
        </div>
    );
};
