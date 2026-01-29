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
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-2 border-b pb-2">{title}</h3>
            {description && <p className="text-xs text-slate-500 mb-4">{description}</p>}

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                {availableFields.map(option => {
                    const isSelected = selectedFields.includes(option.value);
                    return (
                        <div
                            key={option.value}
                            onClick={() => toggleField(option.value)}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${isSelected
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-600'
                                }`}
                        >
                            <span className="text-sm font-medium">{option.label}</span>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-300'
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
