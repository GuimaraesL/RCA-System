
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
            {error && <span className="text-[10px] text-red-500 font-medium mt-0.5 block">{t('common.requiredField')}</span>}
        </div>
    );
};
