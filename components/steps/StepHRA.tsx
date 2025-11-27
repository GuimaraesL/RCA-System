
import React from 'react';
import { RcaRecord } from '../../types';
import { UserCheck, CheckSquare, Square, XSquare } from 'lucide-react';
import { Textarea } from '../ui/Textarea';

interface StepHRAProps {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
}

export const StepHRA: React.FC<StepHRAProps> = ({ data, onChange }) => {
    
    const updateHraQuestion = (id: string, field: 'answer' | 'comment', value: any) => {
        if (!data.human_reliability) return;
        const newQuestions = data.human_reliability.questions.map(q => 
            q.id === id ? { ...q, [field]: value } : q
        );
        onChange('human_reliability', { ...data.human_reliability, questions: newQuestions });
    };
  
    const updateHraConclusion = (id: string, field: 'selected' | 'description', value: any) => {
       if (!data.human_reliability) return;
       const newConclusions = data.human_reliability.conclusions.map(c => 
           c.id === id ? { ...c, [field]: value } : c
       );
       onChange('human_reliability', { ...data.human_reliability, conclusions: newConclusions });
    };

    if (!data.human_reliability) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex gap-3 text-indigo-700 text-sm">
                <UserCheck size={20} className="mt-0.5" />
                <div>
                    <strong>Human Reliability Analysis (HRA)</strong>
                    <p>Explore losses related to "Method" and "Manpower" to identify potential human errors.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Questionnaire</h3>
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b">
                            <th className="p-3 w-16">ID</th>
                            <th className="p-3">Question</th>
                            <th className="p-3 w-24 text-center">Yes</th>
                            <th className="p-3 w-24 text-center">No</th>
                            <th className="p-3 w-1/3">Comments</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.human_reliability.questions.map(q => (
                            <tr key={q.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-xs text-slate-400 max-w-[80px] truncate" title={q.id}>{q.id}</td>
                                <td className="p-3">
                                    <div className="text-xs text-slate-400 mb-1 font-bold uppercase">{q.category}</div>
                                    {q.question_snapshot || q.question}
                                </td>
                                <td className="p-3 text-center"><button onClick={() => updateHraQuestion(q.id, 'answer', 'YES')} className={`p-1 rounded ${q.answer === 'YES' ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}>{q.answer === 'YES' ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-3 text-center"><button onClick={() => updateHraQuestion(q.id, 'answer', 'NO')} className={`p-1 rounded ${q.answer === 'NO' ? 'text-red-500 bg-red-50' : 'text-slate-300'}`}>{q.answer === 'NO' ? <XSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-3">
                                    <input type="text" className="w-full border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent text-xs py-1" placeholder="Add comment..." value={q.comment} onChange={e => updateHraQuestion(q.id, 'comment', e.target.value)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">8. Conclusion (Possible Causes)</h3>
                
                <div className="space-y-4">
                    {data.human_reliability.conclusions.map(c => (
                        <div key={c.id} className={`p-4 rounded border ${c.selected ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <button onClick={() => updateHraConclusion(c.id, 'selected', !c.selected)} className={c.selected ? 'text-indigo-600' : 'text-slate-300'}>
                                    {c.selected ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                                <span className={`font-bold text-sm ${c.selected ? 'text-indigo-800' : 'text-slate-700'}`}>{c.label}</span>
                            </div>
                            {c.selected && (
                                <div className="pl-8 animate-in fade-in slide-in-from-top-1">
                                    <Textarea 
                                        placeholder="Descreva brevemente..." 
                                        rows={2}
                                        value={c.description}
                                        onChange={e => updateHraConclusion(c.id, 'description', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">7.1 Validation</h3>
                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">O coordenador da máquina valida a análise realizada?</label>
                        <div className="flex gap-4 mt-2">
                            <button 
                                onClick={() => onChange('human_reliability', {...data.human_reliability!, validation: {...data.human_reliability!.validation, isValidated: 'YES'}} )} 
                                className={`flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium ${data.human_reliability!.validation.isValidated === 'YES' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-300 text-slate-600'}`}
                            >
                                <CheckSquare size={16}/> YES
                            </button>
                            <button 
                                onClick={() => onChange('human_reliability', {...data.human_reliability!, validation: {...data.human_reliability!.validation, isValidated: 'NO'}} )}
                                className={`flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium ${data.human_reliability!.validation.isValidated === 'NO' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-300 text-slate-600'}`}
                            >
                                <XSquare size={16}/> NO
                            </button>
                        </div>
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Comentários do Coordenador</label>
                        <Textarea 
                            rows={3}
                            value={data.human_reliability!.validation.comment}
                            onChange={e => onChange('human_reliability', {...data.human_reliability!, validation: {...data.human_reliability!.validation, comment: e.target.value}} )}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
