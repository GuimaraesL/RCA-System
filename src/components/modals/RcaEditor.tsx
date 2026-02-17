/**
 * Proposta: Componente principal do Editor de RCA (Wizard).
 * Fluxo: Renderiza os passos da análise consumindo a lógica centralizada no hook useRcaForm.
 */

import React, { useEffect, useState, useRef } from 'react';
import { RcaRecord, ActionRecord } from '../../types';
import { STATUS_IDS } from '../../constants/SystemConstants';
import { Save, ArrowLeft, Check, ChevronDown } from 'lucide-react';
import { useRcaForm } from '../../hooks/useRcaForm';
import { ActionModal } from './ActionModal';
import { useLanguage } from '../../context/LanguageDefinition';
import { translateStatus } from '../../utils/statusUtils';
import { ConfirmModal } from './ConfirmModal';
import { getWizardSteps } from '../../constants/WizardSteps';
import { Button } from '../ui/Button';

// Importação dos Passos do Wizard
import { Step1General } from '../steps/Step1General';
import { Step2Problem } from '../steps/Step2Problem';
import { Step3Technical } from '../steps/Step3Technical';
import { Step4Investigation } from '../steps/Step4Investigation';
import { Step5Actions } from '../steps/Step5Actions';
import { Step6Checklist } from '../steps/Step6Checklist';
import { Step7Additional } from '../steps/Step7Additional';
import { StepHRA } from '../steps/StepHRA';

interface RcaEditorProps {
    existingRecord?: RcaRecord | null;
    onClose: () => void;
    onSave: () => void;
}

export const RcaEditor: React.FC<RcaEditorProps> = ({ existingRecord, onClose, onSave }) => {
    const { t } = useLanguage();

    const {
        formData, setFormData,
        step, setStep,
        isAnalyzing,
        isSaving,
        validationErrors,
        linkedActions,
        handleChange,
        handleAssetSelect,
        handleSave,
        handleSaveAction,
        handleDeleteAction,
        handleAnalyzeAI,
        isFieldRequired,
        showHra,
        hasStepError,
        assets,
        taxonomy,
        refreshAssets
    } = useRcaForm(existingRecord || null, onSave);

    // Controle de modais internos de Ação (UI Only)
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingAction, setEditingAction] = useState<ActionRecord | null>(null);
    const [deleteActionModalOpen, setDeleteActionModalOpen] = useState(false);
    const [actionToDelete, setActionToDelete] = useState<string | null>(null);

    // Orquestradores de UI para Planos de Ação
    const handleAddAction = () => {
        setEditingAction(null);
        setIsActionModalOpen(true);
    };

    const handleEditAction = (action: ActionRecord) => {
        setEditingAction(action);
        setIsActionModalOpen(true);
    };

    const handleDeleteActionUI = (id: string) => {
        setActionToDelete(id);
        setDeleteActionModalOpen(true);
    };

    const confirmDeleteAction = async () => {
        if (actionToDelete) {
            try {
                await handleDeleteAction(actionToDelete);
            } catch (error) {
                console.error('Erro ao excluir ação:', error);
            }
        }
        setDeleteActionModalOpen(false);
        setActionToDelete(null);
    };

    const onSaveActionUI = async (action: ActionRecord) => {
        await handleSaveAction(action);
        setIsActionModalOpen(false);
    };

    const isCompleted = formData.status === STATUS_IDS.CONCLUDED;
    const stepsList = getWizardSteps(t);
    const headerId = React.useId();

    return (
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col h-full w-full max-w-[1600px] mx-auto relative overflow-hidden animate-scale-in"> 
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose} 
                        className="p-2 -ml-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-700 transition-colors focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        data-testid="btn-close-editor"
                    >
                        <ArrowLeft size={24} strokeWidth={2} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">{formData.what || t('analysesPage.newTitle')}</h2>
                        <div className="text-xs font-medium text-slate-500 flex items-center gap-3 mt-1">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">ID: {formData.id}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{t('common.version') || 'Versão'}: {formData.version}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-end">
                        <label htmlFor={`${headerId}-status`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 cursor-pointer">{t('common.status')}</label>
                        <div className="relative group">
                            <select
                                id={`${headerId}-status`}
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                data-testid="select-rca-status"
                                className={`appearance-none cursor-pointer pl-4 pr-10 py-2 rounded-lg text-sm font-bold border transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none ${isCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                {taxonomy.analysisStatuses.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {translateStatus(s.id, s.name, t)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stepper */}
            <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200 overflow-x-auto">
                <div className="flex justify-between items-start min-w-[800px] max-w-5xl mx-auto">
                    {stepsList.map((s, index) => {
                        const isCompletedStep = step > s.id;
                        const isCurrent = step === s.id;
                        const hasError = hasStepError(s.fields);

                        return (
                            <div 
                                key={s.id} 
                                className="flex-1 flex flex-col items-center relative group cursor-pointer select-none" 
                                onClick={() => setStep(s.id)}
                                data-testid={`step-indicator-${s.id}`}
                            >
                                {/* Linha Conectora */}
                                {index < stepsList.length - 1 && (
                                    <div className={`absolute top-4 left-1/2 w-full h-[2px] transition-colors duration-500 ${isCompletedStep ? 'bg-emerald-500' : 'bg-slate-200'}`} style={{ zIndex: 0 }} />
                                )}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 relative
                                    ${isCompletedStep ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' :
                                    isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 scale-110' :
                                    hasError ? 'bg-white border-rose-500 text-rose-500 shadow-sm' :
                                    'bg-white border-slate-300 text-slate-400 group-hover:border-blue-400 group-hover:text-blue-500'}`}
                                    style={{ zIndex: 1 }}
                                >
                                    {isCompletedStep ? <Check size={16} strokeWidth={3} /> : s.id}
                                    {hasError && !isCurrent && !isCompletedStep && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></span>}
                                </div>
                                <span className={`text-xs font-bold mt-3 transition-colors duration-200 ${isCurrent ? 'text-blue-700' : isCompletedStep ? 'text-emerald-600' : hasError ? 'text-rose-600' : 'text-slate-500 group-hover:text-slate-700'}`}>{s.title}</span>
                                <span className={`text-[10px] font-medium hidden md:block mt-0.5 transition-colors ${isCurrent ? 'text-blue-400' : 'text-slate-400'}`}>{s.subtitle}</span>
                            </div>
                        );
                    })}
                </div>
                {showHra && (
                    <div className="flex justify-center mt-6 pt-4 border-t border-slate-200/60 max-w-5xl mx-auto">
                        <button 
                            onClick={() => setStep(8)} 
                            className={`text-xs font-bold py-1.5 px-4 rounded-full flex items-center gap-2 transition-all border ${step === 8 ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                            data-testid="btn-show-hra"
                        >
                            <span className={`w-2 h-2 rounded-full ${step === 8 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                            {t('wizard.stepHRA.hraAvailableTitle')}
                        </button>
                    </div>
                )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-slate-50 custom-scrollbar">
                <div key={step} className="max-w-7xl mx-auto min-h-full animate-slide-up">
                    {step === 1 && <Step1General data={formData} onChange={handleChange} assets={assets} taxonomy={taxonomy} onAssetSelect={handleAssetSelect} onRefreshAssets={refreshAssets} errors={validationErrors} isFieldRequired={isFieldRequired} />}
                    {step === 2 && <Step2Problem data={formData} onChange={handleChange} taxonomy={taxonomy} errors={validationErrors} isFieldRequired={isFieldRequired} />}
                    {step === 3 && <Step3Technical data={formData} onChange={handleChange} taxonomy={taxonomy} errors={validationErrors} isFieldRequired={isFieldRequired} />}
                    {step === 4 && <Step4Investigation data={formData} onChange={handleChange} onAnalyzeAI={handleAnalyzeAI} isAnalyzing={isAnalyzing} taxonomy={taxonomy} showHra={showHra} isFieldRequired={isFieldRequired} errors={validationErrors} />}
                    {step === 5 && <Step5Actions data={formData} onChange={handleChange} linkedActions={linkedActions} onAddActionPlan={handleAddAction} onEditActionPlan={handleEditAction} onDeleteActionPlan={handleDeleteActionUI} isFieldRequired={isFieldRequired} errors={validationErrors} />}
                    {step === 6 && <Step6Checklist data={formData} onChange={handleChange} />}
                    {step === 7 && <Step7Additional data={formData} onChange={handleChange} />}
                    {step === 8 && showHra && <StepHRA data={formData} onChange={handleChange} />}
                </div>
            </div>

            {/* Rodapé */}
            <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-xl flex justify-between items-center z-20 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
                <Button 
                    variant="ghost" 
                    onClick={onClose} 
                    data-testid="btn-cancel-editor"
                >
                    {t('common.cancel')}
                </Button>
                <div className="flex gap-4">
                    {step > 1 && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (step === 8) setStep(4);
                                else setStep(s => Math.max(1, s - 1));
                            }} 
                            data-testid="btn-prev-step"
                        >
                            {t('pagination.previous')}
                        </Button>
                    )}
                    <Button 
                        variant="primary"
                        onClick={handleSave} 
                        isLoading={isSaving}
                        data-testid="btn-save-rca"
                        className="gap-2"
                    >
                        {!isSaving && <Save size={18} />}
                        {t('common.save')}
                    </Button>
                    {step < 7 && (
                        <Button 
                            variant="primary"
                            onClick={() => setStep(s => Math.min(7, s + 1))} 
                            data-testid="btn-next-step"
                            className="group gap-2 px-8"
                        >
                            {t('pagination.next')}
                            <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    )}
                </div>
            </div>

            <ActionModal isOpen={isActionModalOpen} initialData={editingAction} fixedRca={{ id: formData.id, title: formData.what || formData.id || t('analysesPage.newTitle') }} onClose={() => setIsActionModalOpen(false)} onSave={onSaveActionUI} />
            <ConfirmModal isOpen={deleteActionModalOpen} title={t('common.delete')} message={t('modals.deleteActionMessage')} confirmText={t('common.delete')} cancelText={t('common.cancel')} onConfirm={confirmDeleteAction} onCancel={() => { setDeleteActionModalOpen(false); setActionToDelete(null); }} variant="danger" />
        </div>
    );
};
