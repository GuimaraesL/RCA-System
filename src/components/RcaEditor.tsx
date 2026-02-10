/**
 * Proposta: Componente principal do Editor de RCA (Wizard).
 * Fluxo: Orquestra a renderização dos passos da análise, gerenciamento de ações vinculadas e comunicação com a lógica de negócio (useRcaLogic).
 */

import React, { useEffect, useState, useRef } from 'react';
import { RcaRecord, ActionRecord } from '../types';
import { STATUS_IDS, ROOT_CAUSE_M_IDS } from '../constants/SystemConstants';
import { generateId } from '../services/utils';
import { useRcaContext } from '../context/RcaContext';
import { Save, ArrowLeft, Lock, Check, ChevronDown } from 'lucide-react';
import { useRcaLogic } from '../hooks/useRcaLogic';
import { ActionModal } from './ActionModal';
import { useLanguage } from '../context/LanguageDefinition';
import { translateStatus } from '../utils/statusUtils';
import { ConfirmModal } from './ConfirmModal';
import { animateModalEnter } from '../services/animations'; 

// Importação dos Passos do Wizard
import { Step1General } from './steps/Step1General';
import { Step2Problem } from './steps/Step2Problem';
import { Step3Technical } from './steps/Step3Technical';
import { Step4Investigation } from './steps/Step4Investigation';
import { Step5Actions } from './steps/Step5Actions';
import { Step6Checklist } from './steps/Step6Checklist';
import { Step7Additional } from './steps/Step7Additional';
import { StepHRA } from './steps/StepHRA';

interface RcaEditorProps {
    existingRecord?: RcaRecord | null;
    onClose: () => void;
    onSave: () => void;
}

export const RcaEditor: React.FC<RcaEditorProps> = ({ existingRecord, onClose, onSave }) => {
    const { t } = useLanguage();
    
    // Integração com o contexto global para gestão de planos de ação
    const { actions, addAction, updateAction, deleteAction } = useRcaContext();

    const {
        step, setStep,
        assets, refreshAssets,
        taxonomy,
        isAnalyzing,
        formData, setFormData,
        handleAssetSelect,
        handleAnalyzeAI,
        handleSave,
        isFieldRequired,
        validationErrors 
    } = useRcaLogic(existingRecord || null, onSave);

    // Estado local para ações vinculadas a esta análise específica
    const [linkedActions, setLinkedActions] = useState<ActionRecord[]>([]);

    // Controle de modais internos
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingAction, setEditingAction] = useState<ActionRecord | null>(null);
    const [deleteActionModalOpen, setDeleteActionModalOpen] = useState(false);
    const [actionToDelete, setActionToDelete] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Dispara animação de entrada do modal principal
    useEffect(() => {
        if (containerRef.current) {
            animateModalEnter(containerRef.current);
        }
    }, []);

    // Sincroniza planos de ação vinculados ao ID da análise
    const refreshActions = () => {
        if (formData.id) {
            setLinkedActions(actions.filter(a => a.rca_id === formData.id));
        }
    };

    // Recarrega ações sempre que entrar no passo 5 ou houver mudanças no contexto
    useEffect(() => {
        if (step === 5 && formData.id) {
            refreshActions();
        }
    }, [step, formData.id, actions]);

    /**
     * Atualizador genérico de campos com suporte a caminhos aninhados (ex: 'ishikawa.method').
     */
    const handleChange = (field: string, value: any) => {
        setFormData(prev => {
            if (!field.includes('.')) {
                return { ...prev, [field]: value };
            }

            const parts = field.split('.');
            const updateDeep = (obj: any, path: string[], val: any): any => {
                const [head, ...tail] = path;
                if (tail.length === 0) {
                    return { ...obj, [head]: val };
                }
                return {
                    ...obj,
                    [head]: updateDeep(obj[head] || {}, tail, val)
                };
            };

            return updateDeep(prev, parts, value);
        });
    };

    // Orquestradores de Planos de Ação
    const handleAddAction = () => {
        setEditingAction(null);
        setIsActionModalOpen(true);
    };

    const handleEditAction = (action: ActionRecord) => {
        setEditingAction(action);
        setIsActionModalOpen(true);
    };

    const handleDeleteAction = (id: string) => {
        setActionToDelete(id);
        setDeleteActionModalOpen(true);
    };

    const confirmDeleteAction = async () => {
        if (actionToDelete) {
            try {
                await deleteAction(actionToDelete);
                console.log('✅ Ação excluída:', actionToDelete);
                refreshActions();
            } catch (error) {
                console.error('❌ Erro ao excluir ação:', error);
            }
        }
        setDeleteActionModalOpen(false);
        setActionToDelete(null);
    };

    const handleSaveAction = async (action: ActionRecord) => {
        if (!action.id) action.id = generateId('ACT');
        action.rca_id = formData.id; 

        try {
            if (actions.find(a => a.id === action.id)) {
                await updateAction(action);
            } else {
                await addAction(action);
            }
            refreshActions();
        } catch (error) {
            console.error('❌ Erro ao salvar ação:', error);
        }
        setIsActionModalOpen(false);
    };

    // Flag visual para estilização baseada no status de conclusão
    const isCompleted = formData.status === STATUS_IDS.CONCLUDED;

    // Lógica condicional para exibição do passo de Análise de Confiabilidade Humana (HRA)
    const showHra = formData.root_causes && formData.root_causes.some(rc =>
        (rc.root_cause_m_id === ROOT_CAUSE_M_IDS.MANPOWER || rc.root_cause_m_id === ROOT_CAUSE_M_IDS.METHOD) && !!rc.root_cause_m_id
    );

    // Definição dos campos pertencentes a cada passo para validação visual nos indicadores
    const stepsList = [
        { id: 1, title: t('wizard.stepNames.step1.title'), subtitle: t('wizard.stepNames.step1.subtitle'), fields: ['subgroup_id', 'component_type', 'failure_date', 'failure_time', 'analysis_type', 'facilitator', 'participants', 'os_number', 'start_date', 'completion_date'] },
        { id: 2, title: t('wizard.stepNames.step2.title'), subtitle: t('wizard.stepNames.step2.subtitle'), fields: ['who', 'when', 'where_description', 'what', 'problem_description', 'potential_impacts', 'quality_impacts'] },
        { id: 3, title: t('wizard.stepNames.step3.title'), subtitle: t('wizard.stepNames.step3.subtitle'), fields: ['specialty_id', 'failure_mode_id', 'failure_category_id', 'downtime_minutes', 'financial_impact'] },
        { id: 4, title: t('wizard.stepNames.step4.title'), subtitle: t('wizard.stepNames.step4.subtitle'), fields: ['five_whys', 'ishikawa', 'root_causes'] },
        { id: 5, title: t('wizard.stepNames.step5.title'), subtitle: t('wizard.stepNames.step5.subtitle'), fields: ['actions'] },
        { id: 6, title: t('wizard.stepNames.step6.title'), subtitle: t('wizard.stepNames.step6.subtitle'), fields: [] },
        { id: 7, title: t('wizard.stepNames.step7.title'), subtitle: t('wizard.stepNames.step7.subtitle'), fields: [] }
    ];

    const hasStepError = (stepId: number) => {
        const stepFields = stepsList.find(s => s.id === stepId)?.fields || [];
        return stepFields.some(field => validationErrors[field]);
    };

    return (
        <div ref={containerRef} className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full w-full max-w-[1600px] mx-auto relative opacity-0"> 
            {/* Cabeçalho do Editor */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{formData.what || t('analysesPage.newTitle')}</h2>
                        <div className="text-xs text-slate-500 flex gap-2">
                            <span className="font-mono">{formData.id}</span>
                            <span>•</span>
                            <span>{t('common.version') || 'Ver:'} {formData.version}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-end">
                        <label htmlFor="rca_status" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('common.status')}</label>
                        <div className="relative">
                            <select
                                id="rca_status"
                                name="rca_status"
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                className={`appearance-none cursor-pointer pl-3 pr-8 py-1.5 rounded-lg text-sm font-bold border transition-colors focus:ring-2 focus:ring-blue-200 focus:outline-none ${isCompleted
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}
                            >
                                {taxonomy.analysisStatuses.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {translateStatus(s.id, s.name, t)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isCompleted ? 'text-green-500' : 'text-slate-400'}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Indicador de Passos (Stepper) */}
            <div className="px-6 py-6 bg-slate-50 border-b border-slate-200 overflow-x-auto">
                <div className="flex justify-between items-start min-w-[800px]">
                    {stepsList.map((s, index) => {
                        const isCompletedStep = step > s.id;
                        const isCurrent = step === s.id;
                        const hasError = hasStepError(s.id);

                        return (
                            <div key={s.id} className="flex-1 flex flex-col items-center relative group cursor-pointer" onClick={() => setStep(s.id)}>
                                {/* Linha Conectora */}
                                {index < stepsList.length - 1 && (
                                    <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 ${isCompletedStep ? 'bg-green-500' : 'bg-gray-200'}`} />
                                )}

                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all z-10
                            ${isCompletedStep ? 'bg-green-500 border-green-500 text-white' :
                                            isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' :
                                                hasError ? 'bg-red-50 border-red-500 text-red-500' :
                                                    'bg-white border-gray-300 text-gray-400 group-hover:border-blue-300'}`}
                                >
                                    {isCompletedStep ? <Check size={16} strokeWidth={3} /> : s.id}
                                </div>
                                <span className={`text-xs font-bold mt-2 transition-colors ${isCurrent ? 'text-blue-600' : isCompletedStep ? 'text-green-600' : 'text-gray-500'}`}>
                                    {s.title}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium hidden md:block mt-0.5">
                                    {s.subtitle}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Gatilho para o passo opcional de HRA */}
                {showHra && (
                    <div className="flex justify-center mt-4 pt-4 border-t border-slate-200">
                        <button
                            onClick={() => setStep(8)}
                            className={`text-xs font-bold py-1 px-3 rounded-full flex items-center gap-2 transition-colors border ${step === 8
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            {t('wizard.stepHRA.hraAvailableTitle')}
                        </button>
                    </div>
                )}
            </div>

            {/* Área de Conteúdo dos Passos */}
            <div className="flex-1 overflow-y-auto p-8 pb-24 bg-slate-50/30">

                {step === 1 && (
                    <Step1General
                        data={formData}
                        onChange={handleChange}
                        assets={assets}
                        taxonomy={taxonomy}
                        onAssetSelect={handleAssetSelect}
                        onRefreshAssets={refreshAssets}
                        errors={validationErrors}
                        isFieldRequired={isFieldRequired}
                    />
                )}

                {step === 2 && (
                    <Step2Problem
                        data={formData}
                        onChange={handleChange}
                        taxonomy={taxonomy} 
                        errors={validationErrors}
                        isFieldRequired={isFieldRequired}
                    />
                )}

                {step === 3 && (
                    <Step3Technical
                        data={formData}
                        onChange={handleChange}
                        taxonomy={taxonomy}
                        errors={validationErrors}
                        isFieldRequired={isFieldRequired}
                    />
                )}

                {step === 4 && (
                    <Step4Investigation
                        data={formData}
                        onChange={handleChange}
                        onAnalyzeAI={handleAnalyzeAI}
                        isAnalyzing={isAnalyzing}
                        taxonomy={taxonomy}
                        showHra={showHra}
                        isFieldRequired={isFieldRequired}
                        errors={validationErrors}
                    />
                )}

                {step === 5 && (
                    <Step5Actions
                        data={formData}
                        onChange={handleChange}
                        linkedActions={linkedActions}
                        onAddActionPlan={handleAddAction}
                        onEditActionPlan={handleEditAction}
                        onDeleteActionPlan={handleDeleteAction}
                        isFieldRequired={isFieldRequired}
                        errors={validationErrors}
                    />
                )}

                {step === 6 && (
                    <Step6Checklist
                        data={formData}
                        onChange={handleChange}
                    />
                )}

                {step === 7 && (
                    <Step7Additional
                        data={formData}
                        onChange={handleChange}
                    />
                )}

                {step === 8 && showHra && (
                    <StepHRA
                        data={formData}
                        onChange={handleChange}
                    />
                )}

            </div>

            {/* Rodapé Fixo */}
            <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-slate-500 font-medium hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                >
                    {t('common.cancel')}
                </button>

                <div className="flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                        >
                            {t('pagination.previous')}
                        </button>
                    )}

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2.5 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                    >
                        <Save size={18} />
                        {t('common.save')}
                    </button>

                    {step < 7 && (
                        <button
                            onClick={() => setStep(s => Math.min(7, s + 1))}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        >
                            {t('pagination.next')}
                            <ArrowLeft size={18} className="rotate-180" />
                        </button>
                    )}
                </div>
            </div>

            <ActionModal
                isOpen={isActionModalOpen}
                initialData={editingAction}
                fixedRca={{ id: formData.id, title: formData.what || formData.id || t('analysesPage.newTitle') }}
                onClose={() => setIsActionModalOpen(false)}
                onSave={handleSaveAction}
            />

            <ConfirmModal
                isOpen={deleteActionModalOpen}
                title={t('common.delete')}
                message={t('modals.deleteActionMessage')}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                onConfirm={confirmDeleteAction}
                onCancel={() => {
                    setDeleteActionModalOpen(false);
                    setActionToDelete(null);
                }}
                variant="danger"
            />
        </div>
    );
};