
import React, { useState, useEffect } from 'react';
import { ActionRecord } from '../types';

interface ActionModalProps {
    isOpen: boolean;
    initialData: ActionRecord | null;
    rcaList?: {id: string, title: string}[];
    fixedRca?: {id: string, title: string};
    onClose: () => void;
    onSave: (a: ActionRecord) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({ isOpen, initialData, rcaList, fixedRca, onClose, onSave }) => {
    const [form, setForm] = useState<ActionRecord>({
        id: '',
        rca_id: '',
        action: '',
        responsible: '',
        date: new Date().toISOString().split('T')[0],
        status: '1',
        moc_number: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setForm(initialData);
            } else {
                setForm({
                    id: '',
                    rca_id: fixedRca ? fixedRca.id : '',
                    action: '',
                    responsible: '',
                    date: new Date().toISOString().split('T')[0],
                    status: '1',
                    moc_number: ''
                });
            }
        }
    }, [isOpen, initialData, fixedRca]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!form.rca_id) return alert('Please select a linked Analysis');
        onSave(form);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">{initialData ? 'Edit Action Plan' : 'New Action Plan'}</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Linked Analysis <span className="text-red-500">*</span></label>
                        {fixedRca ? (
                            <div className="w-full border p-2 rounded text-sm bg-slate-100 text-slate-700 font-medium">
                                {fixedRca.title}
                            </div>
                        ) : (
                            <select 
                                required
                                className="w-full border p-2 rounded text-sm bg-white text-slate-900"
                                value={form.rca_id}
                                onChange={e => setForm({...form, rca_id: e.target.value})}
                            >
                                <option value="">Select RCA...</option>
                                {rcaList?.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Action Description <span className="text-red-500">*</span></label>
                        <textarea 
                            required
                            className="w-full border p-2 rounded text-sm h-24 bg-white text-slate-900"
                            value={form.action}
                            onChange={e => setForm({...form, action: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Responsible</label>
                            <input type="text" required className="w-full border p-2 rounded text-sm bg-white text-slate-900" value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
                             <input type="date" required className="w-full border p-2 rounded text-sm bg-white text-slate-900" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Status (Box)</label>
                            <select className="w-full border p-2 rounded text-sm bg-white text-slate-900" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                                <option value="1">1 - Aprovada</option>
                                <option value="2">2 - Em Andamento</option>
                                <option value="3">3 - Concluída</option>
                                <option value="4">4 - Ef. Comprovada</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">MOC Number (Optional)</label>
                            <input type="text" className="w-full border p-2 rounded text-sm bg-white text-slate-900" value={form.moc_number || ''} onChange={e => setForm({...form, moc_number: e.target.value})} />
                         </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Save Action</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
