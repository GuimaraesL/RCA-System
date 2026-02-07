
import React, { TextareaHTMLAttributes } from 'react';
import { useLanguage } from '../../context/LanguageDefinition';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
    id: string; // Required for accessibility
    label?: string;
    error?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ id, label, error, className, value, ...props }) => {
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
            <textarea
                id={id}
                name={id}
                value={safeValue}
                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-shadow resize-y ${error
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/10'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                    } ${className || ''}`}
                {...props}
            />
            {error && <span className="text-[10px] text-red-500 font-medium mt-0.5 block">{t('common.requiredField')}</span>}
        </div>
    );
};
