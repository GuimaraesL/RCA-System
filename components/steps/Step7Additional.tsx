
import React from 'react';
import { Textarea } from '../ui/Textarea';
import { RcaRecord } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface Step7Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const Step7Additional: React.FC<Step7Props> = ({ data, onChange }) => {
    
    // Ensure additionalInfo exists (if migrating old record)
    const info = data.additionalInfo || { meetingNotes: '', comments: '', historicalInfo: '' };

    const updateInfo = (field: keyof typeof info, value: string) => {
        onChange('additionalInfo', { ...info, [field]: value });
    };

    const addLesson = () => {
        onChange('lessons_learned', [...data.lessons_learned, '']);
    };

    const updateLesson = (idx: number, val: string) => {
        const list = [...data.lessons_learned];
        list[idx] = val;
        onChange('lessons_learned', list);
    };

    const removeLesson = (idx: number) => {
        const list = [...data.lessons_learned];
        list.splice(idx, 1);
        onChange('lessons_learned', list);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Informações Adicionais</h2>
                <p className="text-gray-600">Documentação complementar e lições aprendidas</p>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <Textarea
                        label="Notas de Reunião"
                        placeholder="Registre pontos importantes discutidos..."
                        rows={6}
                        value={info.meetingNotes}
                        onChange={(e) => updateInfo('meetingNotes', e.target.value)}
                    />
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <Textarea
                        label="Comentários Gerais"
                        placeholder="Outras observações..."
                        rows={6}
                        value={info.comments}
                        onChange={(e) => updateInfo('comments', e.target.value)}
                    />
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <Textarea
                        label="Informações Históricas"
                        placeholder="Contexto histórico relevante..."
                        rows={8}
                        value={info.historicalInfo}
                        onChange={(e) => updateInfo('historicalInfo', e.target.value)}
                    />
                </div>
            </div>

            {/* Lessons Learned */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                 <div className="flex justify-between items-center mb-4 border-b pb-2">
                     <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">8. Lições Aprendidas</h3>
                     <button onClick={addLesson} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:text-blue-700">
                        <Plus size={14}/> ADD
                     </button>
                </div>
                <div className="space-y-3">
                    {data.lessons_learned.map((lesson, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={lesson} 
                                onChange={e => updateLesson(idx, e.target.value)}
                            />
                            <button onClick={() => removeLesson(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                    {data.lessons_learned.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma lição aprendida registrada.</p>}
                </div>
             </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Use estas seções para documentar discussões importantes,
                    lições aprendidas e contexto histórico relevante para futuras análises.
                </p>
            </div>
        </div>
    );
};
