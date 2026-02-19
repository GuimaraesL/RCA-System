/**
 * Proposta: Modal para criação e edição de Gatilhos (Triggers).
 * Fluxo: Gerencia o formulário de eventos de parada, integrando-se à árvore de ativos e permitindo a vinculação posterior com análises RCA.
 */

import React, { useEffect, useState, useId, useCallback } from 'react';
import { TriggerRecord, AssetNode, TaxonomyConfig } from '../../types';
import { AssetSelector } from '../selectors/AssetSelector';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { calculateDuration, getAssetName, findAssetPath } from '../../utils/triggerHelpers';
import { translateTriggerStatus } from '../../utils/statusUtils';
import { generateId } from '../../services/utils';
import { useLanguage } from '../../context/LanguageDefinition';
import { X } from 'lucide-react';
import { ShortcutLabel } from '../ui/ShortcutLabel';

interface TriggerModalProps {
    editingTrigger: TriggerRecord;
    setEditingTrigger: (t: TriggerRecord) => void;
    setIsModalOpen: (open: boolean) => void;
    handleSave: (t: TriggerRecord) => void;
    assets: AssetNode[];
    taxonomy: TaxonomyConfig;
    validationErrors?: string[];
}

const DEFAULT_ERRORS: string[] = [];

export const TriggerModal: React.FC<TriggerModalProps> = ({
    editingTrigger,
    setEditingTrigger,
    setIsModalOpen,
    handleSave,
    assets,
    taxonomy,
    validationErrors = DEFAULT_ERRORS
}) => {
    const { t } = useLanguage();
    const idPrefix = useId();
    const [localErrors, setLocalErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Convert array errors to record
        const errs: Record<string, boolean> = {};
        validationErrors.forEach(e => errs[e] = true);
        setLocalErrors(errs);
    }, [validationErrors]);

    const isRequired = (field: string) => {
        const configLabels = taxonomy.mandatoryFields?.trigger?.save || [];
        return configLabels.includes(field);
    };

    // Validation wrapper
    const onSaveClick = useCallback(() => {
        const configLabels = taxonomy.mandatoryFields?.trigger?.save || [];
        const errors: Record<string, boolean> = {};

        for (const field of configLabels) {
            const val = editingTrigger[field as keyof TriggerRecord];
            if (!val || (typeof val === 'string' && val.trim() === '')) {
                errors[field] = true;
            }
        }

        if (Object.keys(errors).length > 0) {
            setLocalErrors(errors);
            return;
        }

        const toSave = {
            ...editingTrigger,
            duration_minutes: calculateDuration(editingTrigger.start_date, editingTrigger.end_date)
        };

        if (!toSave.id) toSave.id = generateId('TRG');
        handleSave(toSave);
    }, [editingTrigger, taxonomy, handleSave]);

    // Esc fecha o modal, Ctrl+S salva
    const handleModalKeys = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsModalOpen(false);
        } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSaveClick();
        }
    }, [setIsModalOpen, onSaveClick]);

    useEffect(() => {
        document.addEventListener('keydown', handleModalKeys);
        return () => document.removeEventListener('keydown', handleModalKeys);
    }, [handleModalKeys]);

    const handleAssetSelect = (node: AssetNode) => {
        const path = findAssetPath(assets, node.id);
        const update = { ...editingTrigger };

        update.area_id = '';
        update.equipment_id = '';
        update.subgroup_id = '';

        if (path) {
            path.forEach((n: AssetNode) => {
                if (n.type === 'AREA') update.area_id = n.id;
                if (n.type === 'EQUIPMENT') update.equipment_id = n.id;
                if (n.type === 'SUBGROUP') update.subgroup_id = n.id;
            });
        } else {
            if (node.type === 'AREA') update.area_id = node.id;
            if (node.type === 'EQUIPMENT') update.equipment_id = node.id;
            if (node.type === 'SUBGROUP') update.subgroup_id = node.id;
        }
        setEditingTrigger(update);
    };

    const hasAssetError = localErrors.area_id || localErrors.equipment_id || localErrors.subgroup_id;

    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div
                data-testid="modal-trigger"
                className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-scale-in"
            >
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-black text-xl text-slate-900 dark:text-white font-display tracking-tight uppercase italic">{t('triggerModal.title')}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30 dark:bg-slate-950/30">
                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            id="trigger_start_date"
                            label={t('triggerModal.startDate')}
                            type="datetime-local"
                            required={isRequired('start_date')}
                            error={localErrors.start_date}
                            value={editingTrigger.start_date || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, start_date: e.target.value })}
                            data-testid="input-trigger-start-date"
                        />
                        <Input
                            id="trigger_end_date"
                            label={t('triggerModal.endDate')}
                            type="datetime-local"
                            required={isRequired('end_date')}
                            error={localErrors.end_date}
                            value={editingTrigger.end_date || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, end_date: e.target.value })}
                            data-testid="input-trigger-end-date"
                        />
                    </div>

                    {/* Technical Location (Asset Tree) */}
                    <div className="space-y-4">
                        <span id={`${idPrefix}-asset-label`} className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {t('wizard.step1.assetSelectorLabel')}
                            {(isRequired('area_id') || isRequired('equipment_id') || isRequired('subgroup_id')) && <span className="text-rose-500 ml-1">*</span>}
                        </span>
                        <div
                            aria-labelledby={`${idPrefix}-asset-label`}
                            className={`p-1 rounded-[1.5rem] border-2 transition-all ${hasAssetError
                                ? 'border-rose-300 ring-4 ring-rose-50 dark:ring-rose-900/20'
                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                                }`}>
                            <AssetSelector
                                assets={assets}
                                onSelect={handleAssetSelect}
                                selectedAssetId={editingTrigger.subgroup_id || editingTrigger.equipment_id || editingTrigger.area_id}
                                selectableTypes={['SUBGROUP']}
                            />
                        </div>
                        {hasAssetError && <span className="text-xs text-rose-500 font-bold block animate-in fade-in flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-rose-500"></span>{t('common.requiredField')}</span>}

                        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 space-y-3 shadow-inner">
                            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                                <strong className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest">{t('wizard.step1.area')}:</strong>
                                <span className="font-black text-slate-900 dark:text-white">{getAssetName(editingTrigger.area_id, assets) || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                                <strong className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest">{t('wizard.step1.equipment')}:</strong>
                                <span className="font-black text-slate-900 dark:text-white">{getAssetName(editingTrigger.equipment_id, assets) || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                                <strong className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest">{t('wizard.step1.subgroup')}:</strong>
                                <span className="font-black text-slate-900 dark:text-white">{getAssetName(editingTrigger.subgroup_id, assets) || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            id="trigger_stop_type"
                            label={t('triggerModal.stopType')}
                            required={isRequired('stop_type')}
                            error={localErrors.stop_type}
                            value={editingTrigger.stop_type || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, stop_type: e.target.value })}
                            data-testid="input-trigger-stop-type"
                        />
                        <Input
                            id="trigger_stop_reason"
                            label={t('triggerModal.stopReason')}
                            required={isRequired('stop_reason')}
                            error={localErrors.stop_reason}
                            value={editingTrigger.stop_reason || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, stop_reason: e.target.value })}
                            data-testid="input-trigger-stop-reason"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select
                            id="trigger_analysis_type"
                            label={t('triggerModal.analysisType')}
                            required={isRequired('analysis_type_id')}
                            error={localErrors.analysis_type_id}
                            value={editingTrigger.analysis_type_id || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, analysis_type_id: e.target.value })}
                            options={[{ value: '', label: t('triggerModal.selectPlaceholder') }, ...(taxonomy.analysisTypes || []).map(t => ({ value: t.id, label: t.name }))]}
                            data-testid="select-trigger-analysis-type"
                        />
                        <Input
                            id="trigger_responsible"
                            label={t('triggerModal.responsible')}
                            required={isRequired('responsible')}
                            error={localErrors.responsible}
                            value={editingTrigger.responsible || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, responsible: e.target.value })}
                            data-testid="input-trigger-responsible"
                        />
                    </div>

                    <Select
                        id="trigger_status"
                        label={t('triggerModal.status')}
                        required={isRequired('status')}
                        error={localErrors.status}
                        value={editingTrigger.status || ''}
                        onChange={e => setEditingTrigger({ ...editingTrigger, status: e.target.value as any })}
                        options={[{ value: '', label: t('triggerModal.selectPlaceholder') }, ...(taxonomy.triggerStatuses || []).map(s => ({ value: s.id, label: translateTriggerStatus(s.id, s.name, t) }))]}
                        data-testid="select-trigger-status"
                    />

                    <Textarea
                        id="trigger_comments"
                        label={t('triggerModal.comments')}
                        required={isRequired('comments')}
                        error={localErrors.comments}
                        value={editingTrigger.comments || ''}
                        onChange={e => setEditingTrigger({ ...editingTrigger, comments: e.target.value })}
                        rows={4}
                        data-testid="input-trigger-comments"
                    />
                </div>

                <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4 flex-shrink-0">
                    <button
                        onClick={() => setIsModalOpen(false)}
                        data-testid="btn-cancel-trigger"
                        className="px-8 py-3 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        title="Esc"
                    >
                        {t('triggerModal.cancel')}
                    </button>
                    <button
                        onClick={onSaveClick}
                        data-testid="btn-save-trigger"
                        className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                        title="Ctrl+S"
                    >
                        <ShortcutLabel text={t('triggerModal.save')} shortcutLetter="S" />
                    </button>
                </div>
            </div>
        </div >
    );
};
