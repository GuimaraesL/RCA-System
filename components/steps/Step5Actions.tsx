
import React from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { RcaRecord, ActionRecord } from '../../types';
import { generateId } from '../../services/storageService';

interface Step5Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    linkedActions: ActionRecord[];
    onAddActionPlan: () => void;
    onEditActionPlan: (action: ActionRecord) => void;
    onDeleteActionPlan: (id: string) => void;
}

export const Step5Actions: React.FC<Step5Props> = ({ 
    data, onChange, linkedActions, onAddActionPlan, onEditActionPlan, onDeleteActionPlan 
}) => {
    
    // Internal Containment Actions
    const addContainment = () => {
        onChange('containment_actions', [
            ...data.containment_actions, 
            { id: generateId('ACT'), action: '', responsible: '', date: '', status: '' }
        ]);
    };

    const removeContainment = (index: number) => {
        const list = [...data.containment_actions];
        list.splice(index, 1);
        onChange('containment_actions', list);
    };

    const updateContainment = (index: number, field: string, value: string) => {
        const list = [...data.containment_actions];
        list[index] = { ...list[index], [field as any]: value };
        onChange('containment_actions', list);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Planos de Ação</h2>
                <p className="text-gray-600">Ações imediatas e corretivas para solucionar a falha</p>
            </div>

            {/* MOC Number */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="max-w-md">
                    <Input 
                        label="6a. Número do MOC (Geral da Análise)"
                        placeholder="Management of Change ID (e.g. AQ40)"
                        value={data.general_moc_number || ''}
                        onChange={(e) => onChange('general_moc_number', e.target.value)}
                    />
                </div>
            </div>

            {/* Containment Actions (Internal) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">2. Ação de Contenção (Imediata)</h3>
                        <Button onClick={addContainment} variant="ghost" className="text-blue-600 text-xs gap-1">
                            <Plus size={14}/> ADD
                        </Button>
                </div>
                {data.containment_actions.map((act, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                        <div className="col-span-6">
                            <Input placeholder="Ação" value={act.action} onChange={e => updateContainment(idx, 'action', e.target.value)} />
                        </div>
                        <div className="col-span-3">
                             <Input placeholder="Responsável" value={act.responsible} onChange={e => updateContainment(idx, 'responsible', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                             <Input type="date" value={act.date} onChange={e => updateContainment(idx, 'date', e.target.value)} />
                        </div>
                        <div className="col-span-1 text-center">
                            <button onClick={() => removeContainment(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
                {data.containment_actions.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma ação de contenção registrada.</p>}
            </div>

            {/* Corrective Actions (External - Linked) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 relative">
                    {/* BOX LEGEND */}
                    <div className="absolute top-4 right-6 flex gap-2 text-[10px] font-bold text-slate-500 border border-slate-200 rounded p-1.5 bg-slate-50">
                    <div className="flex flex-col items-center px-2 border-r border-slate-200"><span>1</span><span>Aprovada</span></div>
                    <div className="flex flex-col items-center px-2 border-r border-slate-200"><span>2</span><span>Em Andamento</span></div>
                    <div className="flex flex-col items-center px-2 border-r border-slate-200"><span>3</span><span>Concluída</span></div>
                    <div className="flex flex-col items-center px-2"><span>4</span><span>Ef. Comprovada</span></div>
                    </div>

                    <div className="flex justify-between items-center mb-4 border-b pb-2 pr-48">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">7. Plano de Ação (Corretiva)</h3>
                        <Button onClick={onAddActionPlan} variant="primary" size="sm" className="gap-2">
                            <Plus size={14}/> ADD ACTION PLAN
                        </Button>
                </div>
                    
                {/* LINKED TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-2">Box</th>
                                <th className="px-4 py-2 w-1/2">Action</th>
                                <th className="px-4 py-2">Responsible</th>
                                <th className="px-4 py-2">Due Date</th>
                                <th className="px-4 py-2 text-right">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {linkedActions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-400 italic bg-slate-50/50">
                                        Nenhuma ação vinculada. Clique em "Add Action Plan".
                                    </td>
                                </tr>
                            )}
                            {linkedActions.map(act => (
                                <tr key={act.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-bold text-center border-r border-slate-100 bg-slate-50/50 w-16">{act.status}</td>
                                    <td className="px-4 py-2">{act.action}</td>
                                    <td className="px-4 py-2">{act.responsible}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{act.date}</td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onEditActionPlan(act)} className="text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                                            <button onClick={() => onDeleteActionPlan(act.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
