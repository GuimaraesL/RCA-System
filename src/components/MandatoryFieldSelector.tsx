import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

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
        <div className="bg-white rounded-2xl shadow-soft border border-slate-100 flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-100/50">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
                {description && <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">{description}</p>}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1.5">
                {availableFields.map(option => {
                    const isSelected = selectedFields.includes(option.value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleField(option.value)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group ${isSelected
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                : 'bg-white border-slate-50 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{option.label}</span>
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110'
                                : 'bg-white border-slate-300 group-hover:border-slate-400'
                                }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                        </button>
                    );
                })}
                {availableFields.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                        <AlertCircle size={24} className="mb-2 opacity-20" />
                        <span className="text-xs italic font-medium">Nenhum campo disponível</span>
                    </div>
                )}
            </div>
            
            <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    {selectedFields.length} selecionado(s)
                </span>
                {selectedFields.length > 0 && (
                    <button 
                        type="button"
                        onClick={() => onChange([])}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                    >
                        Limpar
                    </button>
                )}
            </div>
        </div>
    );
};