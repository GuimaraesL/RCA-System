/**
 * Proposta: Modal para criação e edição de Planos de Ação (CAPA).
 * Fluxo: Gerencia o formulário de ações corretivas, permitindo a vinculação com análises existentes, definição de prazos, responsáveis e status de aprovação (Box).
 */

import React, { useState, useEffect, useId, useCallback } from 'react';
import { ActionRecord } from '../../types';
import { useLanguage } from '../../context/LanguageDefinition';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { X, ShieldCheck } from 'lucide-react';
import { ShortcutLabel } from '../ui/ShortcutLabel';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

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
    const [errors, setErrors] = useState<Record<string, boolean>>({});
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
            setErrors({});
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

    // Esc fecha o modal, Ctrl+S salva
    const handleModalKeys = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const formEl = document.querySelector('[data-testid="modal-action"] form') as HTMLFormElement;
            if (formEl) formEl.requestSubmit();
        }
    }, [isOpen, onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleModalKeys);
        return () => document.removeEventListener('keydown', handleModalKeys);
    }, [handleModalKeys]);

    if (!isOpen) return null;

    const validate = () => {
        const newErrors: Record<string, boolean> = {};
        if (!form.rca_id) newErrors.rca_id = true;
        if (!form.action.trim()) newErrors.action = true;
        if (!form.responsible.trim()) newErrors.responsible = true;
        if (!form.date) newErrors.date = true;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(form);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <Card
                data-testid="modal-action"
                padding="none"
                className="w-full max-w-xl animate-scale-in"
            >
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-white font-display tracking-tight">
                            {initialData ? t('actionModal.titleEdit') : t('actionModal.titleNew')}
                        </h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-full p-2 h-auto text-slate-400"
                    >
                        <X size={20} />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        {fixedRca ? (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('actionModal.linkedAnalysis')}</label>
                                <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-bold shadow-inner">
                                    {fixedRca.title}
                                </div>
                            </div>
                        ) : (
                            <Select
                                id={`${idPrefix}-rca-id`}
                                label={t('actionModal.linkedAnalysis')}
                                required
                                error={errors.rca_id}
                                options={[{ value: '', label: t('actionModal.selectRca') }, ...(rcaList?.map(r => ({ value: r.id, label: r.title })) || [])]}
                                value={form.rca_id}
                                onChange={e => {
                                    setForm({ ...form, rca_id: e.target.value });
                                    if (errors.rca_id) setErrors(prev => ({ ...prev, rca_id: false }));
                                }}
                            />
                        )}
                    </div>

                    <Textarea
                        id={`${idPrefix}-description`}
                        label={t('actionModal.actionDescription')}
                        required
                        error={errors.action}
                        rows={4}
                        placeholder="..."
                        value={form.action}
                        onChange={e => {
                            setForm({ ...form, action: e.target.value });
                            if (errors.action) setErrors(prev => ({ ...prev, action: false }));
                        }}
                    />

                    <div className="grid grid-cols-2 gap-6">
                        <Input
                            id={`${idPrefix}-responsible`}
                            label={t('actionModal.responsible')}
                            required
                            error={errors.responsible}
                            type="text"
                            value={form.responsible}
                            onChange={e => {
                                setForm({ ...form, responsible: e.target.value });
                                if (errors.responsible) setErrors(prev => ({ ...prev, responsible: false }));
                            }}
                        />
                        <Input
                            id={`${idPrefix}-date`}
                            label={t('actionModal.dueDate')}
                            required
                            error={errors.date}
                            type="date"
                            value={form.date}
                            onChange={e => {
                                setForm({ ...form, date: e.target.value });
                                if (errors.date) setErrors(prev => ({ ...prev, date: false }));
                            }}
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

                    <div className="flex justify-end gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            data-testid="btn-cancel-action"
                            title="Esc"
                        >
                            {t('actionModal.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            data-testid="btn-save-action"
                            title="Ctrl+S"
                        >
                            <ShortcutLabel text={t('actionModal.save')} shortcutLetter="S" />
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
