
import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
    return (
        <div className="w-full">
            {label && <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>}
            <input
                className={`w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow ${className}`}
                {...props}
            />
        </div>
    );
};
