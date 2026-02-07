
import React, { useRef, useEffect, useState } from 'react';
import { TriggerRecord, AssetNode, TaxonomyConfig } from '../../types';
import { AssetSelector } from '../AssetSelector'; // Adjust path if needed
import { animateModalEnter } from '../../services/animations';
import { calculateDuration, getAssetName, findAssetPath } from '../../utils/triggerHelpers';
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
    const [localErrors, setLocalErrors] = useState<string[]>(validationErrors);

    useEffect(() => {
        if (modalRef.current) {
            animateModalEnter(modalRef.current);
        }
    }, []);

    useEffect(() => {
        setLocalErrors(validationErrors);
    }, [validationErrors]);

    const isRequired = (field: string) => {
        const configLabels = taxonomy.mandatoryFields?.trigger?.save || [
            'start_date',
            'end_date',
            'area_id',
            'equipment_id',
            'stop_reason',
            'stop_type',
            'responsible',
            'analysis_type_id',
            'status' // Added status to default mandatory fields
        ];
        return configLabels.includes(field);
    };

    // Validation wrapper
    const onSaveClick = () => {
        // Validação de Campos Obrigatórios (Client-Side)
        const configLabels = taxonomy.mandatoryFields?.trigger?.save || [
            'start_date',
            'end_date',
            'area_id',
            'equipment_id',
            'stop_reason',
            'stop_type',
            'responsible',
            'analysis_type_id',
            'status'
        ];

        const errors: string[] = [];
        for (const field of configLabels) {
            // Special check for status to ensure it's not empty
            if (!editingTrigger[field as keyof TriggerRecord]) {
                errors.push(field);
            }
        }

        if (errors.length > 0) {
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

        // Reset
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
            // Fallback
            if (node.type === 'AREA') update.area_id = node.id;
            if (node.type === 'EQUIPMENT') update.equipment_id = node.id;
            if (node.type === 'SUBGROUP') update.subgroup_id = node.id;
        }
        setEditingTrigger(update);
    };


    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden opacity-0">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">{t('triggerModal.title')}</h3>
                </div>
                <div className="p-6 space-y-4">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                {t('triggerModal.startDate')}
                                {isRequired('start_date') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                                type="datetime-local"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${localErrors.includes('start_date') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.start_date}
                                onChange={e => setEditingTrigger({ ...editingTrigger, start_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                {t('triggerModal.endDate')}
                                {isRequired('end_date') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                                type="datetime-local"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${localErrors.includes('end_date') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.end_date}
                                onChange={e => setEditingTrigger({ ...editingTrigger, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Asset Selection */}
                    <div>
                        <label className={`block text-xs font-medium mb-1 ${localErrors.includes('area_id') || localErrors.includes('equipment_id') ? 'text-red-600' : 'text-slate-500'}`}>{t('triggerModal.subgroupSelect')}</label>
                        <div className={`border rounded h-32 overflow-auto bg-slate-50 mb-2 ${localErrors.includes('area_id') || localErrors.includes('equipment_id') ? 'border-red-500' : ''}`}>
                            <AssetSelector
                                assets={assets}
                                onSelect={handleAssetSelect}
                                selectedAssetId={editingTrigger.subgroup_id || editingTrigger.equipment_id}
                                selectableTypes={['SUBGROUP']}
                            />
                        </div>
                        <div className="text-xs text-blue-600">
                            {t('triggerModal.selected')} {getAssetName(editingTrigger.subgroup_id || editingTrigger.equipment_id || editingTrigger.area_id, assets)}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                {t('triggerModal.stopType')}
                                {isRequired('stop_type') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${localErrors.includes('stop_type') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.stop_type}
                                onChange={e => setEditingTrigger({ ...editingTrigger, stop_type: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                {t('triggerModal.stopReason')}
                                {isRequired('stop_reason') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${localErrors.includes('stop_reason') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.stop_reason}
                                onChange={e => setEditingTrigger({ ...editingTrigger, stop_reason: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                {t('triggerModal.analysisType')}
                                {isRequired('analysis_type_id') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <select
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${localErrors.includes('analysis_type_id') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.analysis_type_id}
                                onChange={e => setEditingTrigger({ ...editingTrigger, analysis_type_id: e.target.value })}
                            >
                                <option value="">{t('triggerModal.selectPlaceholder')}</option>
                                {(taxonomy.analysisTypes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                {t('triggerModal.responsible')}
                                {isRequired('responsible') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${localErrors.includes('responsible') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                value={editingTrigger.responsible}
                                onChange={e => setEditingTrigger({ ...editingTrigger, responsible: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                            {t('triggerModal.status')}
                            {isRequired('status') && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <select
                            className={`w-full border rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none ${localErrors.includes('status') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                            value={editingTrigger.status}
                            onChange={e => setEditingTrigger({ ...editingTrigger, status: e.target.value as any })}
                        >
                            <option value="">{t('triggerModal.selectPlaceholder')}</option>
                            {(taxonomy.triggerStatuses || []).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('triggerModal.comments')}</label>
                        <textarea
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none h-20"
                            value={editingTrigger.comments}
                            onChange={e => setEditingTrigger({ ...editingTrigger, comments: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">{t('triggerModal.cancel')}</button>
                        <button onClick={onSaveClick} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">{t('triggerModal.save')}</button>
                    </div>
                </div>
            </div>
        </div >
    );
};
