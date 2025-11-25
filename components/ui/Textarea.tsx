
import React, { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className, ...props }) => {
    return (
        <div className="w-full">
            {label && <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>}
            <textarea
                className={`w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow resize-y ${className}`}
                {...props}
            />
        </div>
    );
};
