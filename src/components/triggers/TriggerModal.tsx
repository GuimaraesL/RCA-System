
import React, { useRef, useEffect, useState } from 'react';
import { TriggerRecord, AssetNode, TaxonomyConfig } from '../../types';
import { AssetSelector } from '../AssetSelector';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { animateModalEnter } from '../../services/animations';
import { calculateDuration, getAssetName, findAssetPath } from '../../utils/triggerHelpers';
import { translateTriggerStatus } from '../../utils/statusUtils';
import { generateId } from '../../services/utils';
import { useLanguage } from '../../context/LanguageDefinition';

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
    const modalRef = useRef<HTMLDivElement>(null);
    const [localErrors, setLocalErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (modalRef.current) {
            animateModalEnter(modalRef.current);
        }
    }, []);

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
    const onSaveClick = () => {
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
    };

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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden opacity-0 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-bold text-lg text-slate-800">{t('triggerModal.title')}</h3>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="trigger_start_date"
                            label={t('triggerModal.startDate')}
                            type="datetime-local"
                            required={isRequired('start_date')}
                            error={localErrors.start_date}
                            value={editingTrigger.start_date || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, start_date: e.target.value })}
                        />
                        <Input
                            id="trigger_end_date"
                            label={t('triggerModal.endDate')}
                            type="datetime-local"
                            required={isRequired('end_date')}
                            error={localErrors.end_date}
                            value={editingTrigger.end_date || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, end_date: e.target.value })}
                        />
                    </div>

                    {/* Technical Location (Asset Tree) */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-500">
                            {t('wizard.step1.assetSelectorLabel')}
                            {(isRequired('area_id') || isRequired('equipment_id') || isRequired('subgroup_id')) && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className={`p-1 rounded-lg border-2 transition-all ${
                            hasAssetError
                            ? 'border-red-500 ring-4 ring-red-100' 
                            : 'border-transparent'
                        }`}>
                            <AssetSelector
                                assets={assets}
                                onSelect={handleAssetSelect}
                                selectedAssetId={editingTrigger.subgroup_id || editingTrigger.equipment_id || editingTrigger.area_id}
                            />
                        </div>
                        {hasAssetError && <span className="text-[10px] text-red-500 font-medium block animate-in fade-in">{t('common.requiredField')}</span>}
                        <div className="p-3 bg-blue-50 rounded border border-blue-100 text-xs text-blue-800 space-y-1">
                            <div><strong>{t('wizard.step1.area')}:</strong> {getAssetName(editingTrigger.area_id, assets) || '-'}</div>
                            <div><strong>{t('wizard.step1.equipment')}:</strong> {getAssetName(editingTrigger.equipment_id, assets) || '-'}</div>
                            <div><strong>{t('wizard.step1.subgroup')}:</strong> {getAssetName(editingTrigger.subgroup_id, assets) || '-'}</div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="trigger_stop_type"
                            label={t('triggerModal.stopType')}
                            required={isRequired('stop_type')}
                            error={localErrors.stop_type}
                            value={editingTrigger.stop_type || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, stop_type: e.target.value })}
                        />
                        <Input
                            id="trigger_stop_reason"
                            label={t('triggerModal.stopReason')}
                            required={isRequired('stop_reason')}
                            error={localErrors.stop_reason}
                            value={editingTrigger.stop_reason || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, stop_reason: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            id="trigger_analysis_type"
                            label={t('triggerModal.analysisType')}
                            required={isRequired('analysis_type_id')}
                            error={localErrors.analysis_type_id}
                            value={editingTrigger.analysis_type_id || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, analysis_type_id: e.target.value })}
                            options={[{ value: '', label: t('triggerModal.selectPlaceholder') }, ...(taxonomy.analysisTypes || []).map(t => ({ value: t.id, label: t.name }))]}
                        />
                        <Input
                            id="trigger_responsible"
                            label={t('triggerModal.responsible')}
                            required={isRequired('responsible')}
                            error={localErrors.responsible}
                            value={editingTrigger.responsible || ''}
                            onChange={e => setEditingTrigger({ ...editingTrigger, responsible: e.target.value })}
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
                    />

                    <Textarea
                        id="trigger_comments"
                        label={t('triggerModal.comments')}
                        required={isRequired('comments')}
                        error={localErrors.comments}
                        value={editingTrigger.comments || ''}
                        onChange={e => setEditingTrigger({ ...editingTrigger, comments: e.target.value })}
                        rows={3}
                    />
                </div>

                <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 flex-shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">{t('triggerModal.cancel')}</button>
                    <button onClick={onSaveClick} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors active:scale-95">{t('triggerModal.save')}</button>
                </div>
            </div>
        </div >
    );
};
