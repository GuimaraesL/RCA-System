import React from 'react';
import { Check } from 'lucide-react';

interface FieldOption {
    value: string;
    label: string;
}

interface MandatoryFieldSelectorProps {
    title: string;
    description?: string;
    selectedFields: string[];
    availableFields: FieldOption[];
    onChange: (newSelection: string[]) => void;
}

export const MandatoryFieldSelector: React.FC<MandatoryFieldSelectorProps> = ({
    title,
    description,
    selectedFields,
    availableFields,
    onChange
}) => {
    const toggleField = (fieldValue: string) => {
        if (selectedFields.includes(fieldValue)) {
            onChange(selectedFields.filter(f => f !== fieldValue));
        } else {
            onChange([...selectedFields, fieldValue]);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-soft border border-slate-100 p-6 flex flex-col h-full transition-all duration-300 hover:shadow-lg">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 pb-2 border-b border-slate-100 font-display tracking-wider">{title}</h3>
            {description && <p className="text-xs text-slate-500 mb-4 px-0.5">{description}</p>}

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {availableFields.map(option => {
                    const isSelected = selectedFields.includes(option.value);
                    return (
                        <div
                            key={option.value}
                            onClick={() => toggleField(option.value)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all duration-200 group ${isSelected
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                : 'bg-white border-transparent hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <span className="text-sm font-medium">{option.label}</span>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm scale-110'
                                : 'bg-white border-slate-300 group-hover:border-slate-400'
                                }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
