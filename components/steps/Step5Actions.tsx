
import React, { useState } from 'react';
import { RcaRecord, ActionRecord } from '../../types';
import { ClipboardList, Plus, Target, CheckCircle2, AlertTriangle, Edit2, Trash2, Calendar, User } from 'lucide-react';
import { useSorting } from '../../hooks/useSorting';
import { SortHeader } from '../ui/SortHeader';

interface Step5Props {
    data: RcaRecord;
    onChange: (field: string, value: any) => void;
    linkedActions: ActionRecord[];
    onAddActionPlan: (type: 'CORRECTIVE') => void;
    onEditActionPlan: (action: ActionRecord) => void;
    onDeleteActionPlan: (id: string) => void;
}

export const Step5Actions: React.FC<Step5Props> = ({
    data, onChange, linkedActions, onAddActionPlan, onEditActionPlan, onDeleteActionPlan
}) => {

    // --- Sorting Logic ---
    const { sortedItems: sortedActions, sortConfig, handleSort } = useSorting(linkedActions, { key: 'status', direction: 'asc' });

    // Internal Containment Actions
    const updateInternalAction = (index: number, field: string, val: string) => {
        if (!data.containment_actions) return;
        const list = [...data.containment_actions];
        list[index] = { ...list[index], [field]: val };
        onChange('containment_actions', list);
    };

    const addInternalAction = () => {
        const list = data.containment_actions || [];
        onChange('containment_actions', [...list, { what: '', who: '', when: '', status: 'PENDING' }]);
    };

    const removeInternalAction = (index: number) => {
        if (!data.containment_actions) return;
        const list = data.containment_actions.filter((_, i) => i !== index);
        onChange('containment_actions', list);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex gap-3 text-indigo-700 text-sm">
                <Target size={20} className="mt-0.5" />
                <div>
                    <strong>Action Plan Development</strong>
                    <p>Develop containment actions (immediate) and corrective actions (long-term) to address root causes.</p>
                </div>
            </div>

            {/* Internal Actions (Containment) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" /> Containment Actions (Immediate)
                    </h3>
                    <button onClick={addInternalAction} className="text-xs flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">
                        <Plus size={14} /> Add Action
                    </button>
                </div>

                <div className="space-y-3">
                    {(!data.containment_actions || data.containment_actions.length === 0) && (
                        <div className="text-center p-6 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-xs">
                            No containment actions added. Click "Add Action" to start.
                        </div>
                    )}
                    {data.containment_actions?.map((action, idx) => (
                        <div key={idx} className="flex gap-4 items-start p-3 bg-slate-50 rounded border border-slate-100 group">
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">What (Ação)</label>
                                <input
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="Descreva a ação imediata..."
                                    value={action.what}
                                    onChange={e => updateInternalAction(idx, 'what', e.target.value)}
                                />
                            </div>
                            <div className="w-32 space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Who (Resp.)</label>
                                <input
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={action.who}
                                    onChange={e => updateInternalAction(idx, 'who', e.target.value)}
                                />
                            </div>
                            <div className="w-32 space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">When (Data)</label>
                                <input
                                    type="date"
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={action.when}
                                    onChange={e => updateInternalAction(idx, 'when', e.target.value)}
                                />
                            </div>
                            <button onClick={() => removeInternalAction(idx)} className="mt-6 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Corrective Actions (External - Linked) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 relative">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-green-600" /> Corrective Actions (Long Term)
                    </h3>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-4 mr-4 text-[10px] font-mono text-slate-400 border-r pr-4 border-slate-200">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> BOX 1 (Aprovado)</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> BOX 2 (Em Andamento)</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> BOX 3 (Concluído)</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> BOX 4 (Ef. Comprovada)</span>
                        </div>
                        <button
                            onClick={() => onAddActionPlan('CORRECTIVE')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <Plus size={14} /> Add Action Plan
                        </button>
                    </div>
                </div>

                {/* LINKED TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <SortHeader label="Box" sortKey="status" currentSort={sortConfig} onSort={handleSort} width="w-16" />
                                <SortHeader label="Action" sortKey="action" currentSort={sortConfig} onSort={handleSort} width="w-1/2" />
                                <SortHeader label="Responsible" sortKey="responsible" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label="Due Date" sortKey="date" currentSort={sortConfig} onSort={handleSort} />
                                <th className="px-4 py-2 text-right">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedActions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-400 italic bg-slate-50/50">
                                        Nenhuma ação vinculada. Clique em "Add Action Plan".
                                    </td>
                                </tr>
                            )}
                            {sortedActions.map(act => (
                                <tr key={act.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-bold text-center border-r border-slate-100 bg-slate-50/50 w-16">{act.status}</td>
                                    <td className="px-4 py-2">{act.action}</td>
                                    <td className="px-4 py-2">{act.responsible}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{act.date}</td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onEditActionPlan(act)} className="text-slate-400 hover:text-blue-600"><Edit2 size={14} /></button>
                                            <button onClick={() => onDeleteActionPlan(act.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};
