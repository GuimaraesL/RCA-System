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
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700 flex flex-col h-full overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-800 group">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</h3>
                {description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-bold leading-relaxed opacity-70 uppercase">{description}</p>}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-2">
                {availableFields.map(option => {
                    const isSelected = selectedFields.includes(option.value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleField(option.value)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group/btn ${isSelected
                                ? 'bg-white dark:bg-slate-800 border-blue-500 text-blue-700 dark:text-blue-400 shadow-md ring-4 ring-blue-500/5'
                                : 'bg-transparent border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                        >
                            <span className={`text-xs uppercase tracking-tight ${isSelected ? 'font-black' : 'font-bold'}`}>{option.label}</span>
                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 group-hover/btn:border-slate-300 dark:group-hover/btn:border-slate-500'
                                }`}>
                                {isSelected && <Check size={14} strokeWidth={4} />}
                            </div>
                        </button>
                    );
                })}
                {availableFields.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-800/30">
                        <AlertCircle size={32} className="mb-4 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Nenhum campo disponível</span>
                    </div>
                )}
            </div>

            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                    {selectedFields.length} selecionado(s)
                </span>
                {selectedFields.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-[10px] font-black text-blue-600 hover:text-rose-600 uppercase tracking-widest transition-colors"
                    >
                        Limpar
                    </button>
                )}
            </div>
        </div>
    );
};
