
import React, { useState, useEffect, useRef } from 'react';
import { ActionRecord } from '../types';
import { useLanguage } from '../context/LanguageDefinition';
import { animateModalEnter } from '../services/animations';

interface ActionModalProps {
    isOpen: boolean;
    initialData: ActionRecord | null;
    rcaList?: { id: string, title: string }[];
    fixedRca?: { id: string, title: string };
    onClose: () => void;
    onSave: (a: ActionRecord) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({ isOpen, initialData, rcaList, fixedRca, onClose, onSave }) => {
    const { t } = useLanguage();
    const [form, setForm] = useState<ActionRecord>({
        id: '',
        rca_id: '',
        action: '',
        responsible: '',
        date: new Date().toISOString().split('T')[0],
        status: '1',
        moc_number: ''
    });

    const containerRef = useRef<HTMLDivElement>(null);

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
            // Trigger Animation
            if (containerRef.current) {
                animateModalEnter(containerRef.current);
            }
        }
    }, [isOpen, initialData, fixedRca]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.rca_id) return alert(t('actionModal.linkedAnalysis') + ' is required');
        if (!form.action.trim()) return alert(t('actionModal.actionDescription') + ' is required');
        if (!form.responsible.trim()) return alert(t('actionModal.responsible') + ' is required');
        if (!form.date) return alert(t('actionModal.dueDate') + ' is required');

        onSave(form);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div ref={containerRef} className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden opacity-0">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">{initialData ? t('actionModal.titleEdit') : t('actionModal.titleNew')}</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('actionModal.linkedAnalysis')} <span className="text-red-500">*</span></label>
                        {fixedRca ? (
                            <div className="w-full border p-2 rounded text-sm bg-slate-100 text-slate-700 font-medium">
                                {fixedRca.title}
                            </div>
                        ) : (
                            <select
                                id="action_rca_id"
                                name="action_rca_id"
                                required
                                className="w-full border p-2 rounded text-sm bg-white text-slate-900"
                                value={form.rca_id}
                                onChange={e => setForm({ ...form, rca_id: e.target.value })}
                            >
                                <option value="">{t('actionModal.selectRca')}</option>
                                {rcaList?.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('actionModal.actionDescription')} <span className="text-red-500">*</span></label>
                        <textarea
                            id="action_description"
                            name="action_description"
                            required
                            className="w-full border p-2 rounded text-sm h-24 bg-white text-slate-900"
                            value={form.action}
                            onChange={e => setForm({ ...form, action: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('actionModal.responsible')} <span className="text-red-500">*</span></label>
                            <input
                                id="action_responsible"
                                name="action_responsible"
                                type="text"
                                required
                                className="w-full border p-2 rounded text-sm bg-white text-slate-900"
                                value={form.responsible}
                                onChange={e => setForm({ ...form, responsible: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('actionModal.dueDate')} <span className="text-red-500">*</span></label>
                            <input
                                id="action_date"
                                name="action_date"
                                type="date"
                                required
                                className="w-full border p-2 rounded text-sm bg-white text-slate-900"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('actionModal.statusBox')}</label>
                            <select
                                id="action_status"
                                name="action_status"
                                className="w-full border p-2 rounded text-sm bg-white text-slate-900"
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value as any })}
                            >
                                <option value="1">{t('actionModal.statusOptions.approved')}</option>
                                <option value="2">{t('actionModal.statusOptions.inProgress')}</option>
                                <option value="3">{t('actionModal.statusOptions.completed')}</option>
                                <option value="4">{t('actionModal.statusOptions.verified')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('actionModal.mocNumber')}</label>
                            <input
                                id="action_moc"
                                name="action_moc"
                                type="text"
                                className="w-full border p-2 rounded text-sm bg-white text-slate-900"
                                value={form.moc_number || ''}
                                onChange={e => setForm({ ...form, moc_number: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">{t('actionModal.cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">{t('actionModal.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
