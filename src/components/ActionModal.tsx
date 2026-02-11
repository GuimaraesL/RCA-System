/**
 * Proposta: Modal para criação e edição de Planos de Ação (CAPA).
 * Fluxo: Gerencia o formulário de ações corretivas, permitindo a vinculação com análises existentes, definição de prazos, responsáveis e status de aprovação (Box).
 */

import React, { useState, useEffect, useRef, useId } from 'react';
import { ActionRecord } from '../types';
import { useLanguage } from '../context/LanguageDefinition';
import { animateModalEnter } from '../services/animations';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { X, ShieldCheck } from 'lucide-react';

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
    const idPrefix = useId();
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
            // Gatilho da animação de entrada
            if (containerRef.current) {
                animateModalEnter(containerRef.current);
            }
        }
    }, [isOpen, initialData, fixedRca]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validações básicas de formulário
        if (!form.rca_id) return alert(t('actionModal.linkedAnalysis') + ' é obrigatório');
        if (!form.action.trim()) return alert(t('actionModal.actionDescription') + ' é obrigatório');
        if (!form.responsible.trim()) return alert(t('actionModal.responsible') + ' é obrigatório');
        if (!form.date) return alert(t('actionModal.dueDate') + ' é obrigatório');

        onSave(form);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div ref={containerRef} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden opacity-0 border border-slate-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="font-black text-xl text-slate-900 font-display tracking-tight">
                            {initialData ? t('actionModal.titleEdit') : t('actionModal.titleNew')}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        {fixedRca ? (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('actionModal.linkedAnalysis')}</label>
                                <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm text-slate-700 font-bold shadow-inner">
                                    {fixedRca.title}
                                </div>
                            </div>
                        ) : (
                            <Select
                                id={`${idPrefix}-rca-id`}
                                label={t('actionModal.linkedAnalysis')}
                                required
                                options={[{ value: '', label: t('actionModal.selectRca') }, ...(rcaList?.map(r => ({ value: r.id, label: r.title })) || [])]}
                                value={form.rca_id}
                                onChange={e => setForm({ ...form, rca_id: e.target.value })}
                            />
                        )}
                    </div>

                    <Textarea
                        id={`${idPrefix}-description`}
                        label={t('actionModal.actionDescription')}
                        required
                        rows={4}
                        placeholder="..."
                        value={form.action}
                        onChange={e => setForm({ ...form, action: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-6">
                        <Input
                            id={`${idPrefix}-responsible`}
                            label={t('actionModal.responsible')}
                            required
                            type="text"
                            value={form.responsible}
                            onChange={e => setForm({ ...form, responsible: e.target.value })}
                        />
                        <Input
                            id={`${idPrefix}-date`}
                            label={t('actionModal.dueDate')}
                            required
                            type="date"
                            value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <Select
                            id={`${idPrefix}-status`}
                            label={t('actionModal.statusBox')}
                            options={[
                                { value: '1', label: t('actionModal.statusOptions.approved') },
                                { value: '2', label: t('actionModal.statusOptions.inProgress') },
                                { value: '3', label: t('actionModal.statusOptions.completed') },
                                { value: '4', label: t('actionModal.statusOptions.verified') }
                            ]}
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value as any })}
                        />
                        <Input
                            id={`${idPrefix}-moc`}
                            label={t('actionModal.mocNumber')}
                            type="text"
                            value={form.moc_number || ''}
                            onChange={e => setForm({ ...form, moc_number: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-slate-50">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-sm transition-all border border-transparent hover:border-slate-200"
                        >
                            {t('actionModal.cancel')}
                        </button>
                        <button 
                            type="submit" 
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                        >
                            {t('actionModal.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};