/**
 * Proposta: Componente principal do Editor de RCA (Wizard).
 * Fluxo: Renderiza os passos da análise consumindo a lógica centralizada no hook useRcaForm.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RcaRecord, ActionRecord } from '../../types';
import { STATUS_IDS } from '../../constants/SystemConstants';
import { Save, ArrowLeft, Check, ChevronDown } from 'lucide-react';
import { useRcaForm } from '../../hooks/useRcaForm';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

import { ActionModal } from './ActionModal';
import { useLanguage } from '../../context/LanguageDefinition';
import { translateStatus } from '../../utils/statusUtils';
import { ConfirmModal } from './ConfirmModal';
import { getWizardSteps } from '../../constants/WizardSteps';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ShortcutLabel } from '../ui/ShortcutLabel';

// Importação dos Passos do Wizard
import { Step1General } from '../steps/Step1General';
import { Step2Problem } from '../steps/Step2Problem';
import { Step3Technical } from '../steps/Step3Technical';
import { Step4Investigation } from '../steps/Step4Investigation';
import { Step5Actions } from '../steps/Step5Actions';
import { Step6Checklist } from '../steps/Step6Checklist';
import { Step7Additional } from '../steps/Step7Additional';
import { StepHRA } from '../steps/StepHRA';
import { RecurrenceBanner } from '../ui/RecurrenceBanner';

// IA Integration
import { AiProvider, useAi } from '../../context/AIContext';
import { AiSidebar } from '../ai/AiSidebar';
import { BrainCircuit } from 'lucide-react';

interface RcaEditorProps {
    existingRecord?: RcaRecord | null;
    onClose: () => void;
    onSave: () => void;
}

const RcaEditorContent: React.FC<RcaEditorProps> = ({ existingRecord, onClose, onSave }) => {
    const { t } = useLanguage();
    const { isAiOpen, setAiOpen, analyzeRca } = useAi();

    const {
        formData, setFormData,
        step, setStep,
        isAnalyzing,
        aiInsight, setAiInsight,
        recurrences,
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

    // Atalhos de Teclado Locais do Editor
    useKeyboardShortcuts({
        onSave: handleSave,
        onEscape: onClose
    });

    // ... (rest of component)

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

    const handleToggleAi = () => {
        setAiOpen(!isAiOpen);
    };

    const handleApplyAiSuggestion = (suggestion: string) => {
        // Injeta na descrição do problema de forma acumulativa
        setFormData(prev => ({
            ...prev,
            problem_description: prev.problem_description
                ? `${prev.problem_description}\n\n--- Sugestão IA ---\n${suggestion}`
                : suggestion
        }));
    };

    const isCompleted = formData.status === STATUS_IDS.CONCLUDED;
    const stepsList = getWizardSteps(t);
    const headerId = React.useId();

    // Atalhos de navegação entre steps (Alt+← / Alt+→)
    const goToPrev = useCallback(() => {
        setStep(s => {
            if (s === 8) return 4;
            return Math.max(1, s - 1);
        });
    }, [setStep]);

    const goToNext = useCallback(() => {
        setStep(s => Math.min(7, s + 1));
    }, [setStep]);

    useEffect(() => {
        const isInput = (el: EventTarget | null) => {
            if (!el || !(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toLowerCase();
            return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
        };

        const handleStepNav = (e: KeyboardEvent) => {
            if (isInput(e.target)) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNext();
            }
        };
        document.addEventListener('keydown', handleStepNav);
        return () => document.removeEventListener('keydown', handleStepNav);
    }, [goToPrev, goToNext]);

    return (
        <div className="flex items-center justify-center h-full w-full gap-4 max-w-[1920px] mx-auto overflow-hidden transition-all duration-500">
            <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col h-full transition-all duration-500 relative overflow-hidden animate-scale-in ${isAiOpen ? 'flex-1' : 'w-full max-w-[1600px]'}`}>
                {/* Cabeçalho */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="rounded-full p-2 h-auto text-slate-400"
                            data-testid="btn-close-editor"
                        >
                            <ArrowLeft size={24} strokeWidth={2} />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">{formData.what || t('analysesPage.newTitle')}</h2>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-1">
                                <Badge variant="neutral" size="sm" className="font-mono">ID: {formData.id}</Badge>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                <Badge variant="neutral" size="sm">{t('common.version')}: {formData.version}</Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col items-end">
                            <label htmlFor={`${headerId}-status`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 cursor-pointer">{t('common.status')}</label>
                            <div className="relative group">
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                    data-testid="select-rca-status"
                                    className={`appearance-none cursor-pointer pl-4 pr-10 py-2 rounded-lg text-sm font-bold border transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none ${isCompleted
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {taxonomy.analysisStatuses.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {translateStatus(s.id, s.name, t)}
                                        </option>
                                    )) || []}
                                </select>
                                <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                            </div>
                        </div>

                        <button
                            onClick={handleToggleAi}
                            className={`p-2.5 rounded-xl transition-all border flex items-center gap-2 font-bold text-sm shadow-sm ${isAiOpen
                                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                                : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                }`}
                            title="AI Copilot"
                        >
                            <BrainCircuit size={20} className={isAiOpen ? 'animate-pulse' : ''} />
                            {!isAiOpen && <span>AI Help</span>}
                        </button>
                    </div>
                </div>

                {/* Stepper */}
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
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
                                        <div className={`absolute top-4 left-1/2 w-full h-[2px] transition-colors duration-500 ${isCompletedStep ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`} style={{ zIndex: 0 }} />
                                    )}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 relative
                                    ${isCompletedStep ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' :
                                            isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-900/30 scale-110' :
                                                hasError ? 'bg-white dark:bg-slate-800 border-rose-500 text-rose-500 shadow-sm' :
                                                    'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 group-hover:border-blue-400 dark:group-hover:border-blue-500 group-hover:text-blue-500 dark:group-hover:text-blue-400'}`}
                                        style={{ zIndex: 1 }}
                                    >
                                        {isCompletedStep ? <Check size={16} strokeWidth={3} /> : s.id}
                                        {hasError && !isCurrent && !isCompletedStep && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>}
                                    </div>
                                    <span className={`text-xs font-bold mt-3 transition-colors duration-200 ${isCurrent ? 'text-blue-700 dark:text-blue-400' : isCompletedStep ? 'text-emerald-600 dark:text-emerald-400' : hasError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>{s.title}</span>
                                    <span className={`text-[10px] font-medium hidden md:block mt-0.5 transition-colors ${isCurrent ? 'text-blue-400 dark:text-blue-300' : 'text-slate-400 dark:text-slate-500'}`}>{s.subtitle}</span>
                                </div>
                            );
                        })}
                    </div>
                    {showHra && (
                        <div className="flex justify-center mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 max-w-5xl mx-auto">
                            <Button
                                variant={step === 8 ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setStep(8)}
                                className={`flex items-center gap-2 rounded-full ${step === 8 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : ''}`}
                                data-testid="btn-show-hra"
                            >
                                <span className={`w-2 h-2 rounded-full ${step === 8 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                {t('wizard.stepHRA.hraAvailableTitle')}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
                    <div key={step} className="max-w-7xl mx-auto min-h-full animate-slide-up">
                        <RecurrenceBanner recurrences={recurrences} />
                        {step === 1 && <Step1General data={formData} onChange={handleChange} assets={assets} taxonomy={taxonomy} onAssetSelect={handleAssetSelect} onRefreshAssets={refreshAssets} errors={validationErrors} isFieldRequired={isFieldRequired} />}
                        {step === 2 && <Step2Problem data={formData} onChange={handleChange} taxonomy={taxonomy} errors={validationErrors} isFieldRequired={isFieldRequired} />}
                        {step === 3 && <Step3Technical data={formData} onChange={handleChange} taxonomy={taxonomy} errors={validationErrors} isFieldRequired={isFieldRequired} />}
                        {step === 4 && <Step4Investigation data={formData} onChange={handleChange} onAnalyzeAI={handleAnalyzeAI} isAnalyzing={isAnalyzing} taxonomy={taxonomy} showHra={showHra} isFieldRequired={isFieldRequired} errors={validationErrors} />}
                        {step === 5 && <Step5Actions data={formData} onChange={handleChange} linkedActions={linkedActions} onAddActionPlan={handleAddAction} onEditActionPlan={handleEditAction} onDeleteActionPlan={handleDeleteActionUI} isFieldRequired={isFieldRequired} errors={validationErrors} />}
                        {step === 6 && <Step6Checklist data={formData} onChange={handleChange} isFieldRequired={isFieldRequired} />}
                        {step === 7 && <Step7Additional data={formData} onChange={handleChange} isFieldRequired={isFieldRequired} />}
                        {step === 8 && showHra && <StepHRA data={formData} onChange={handleChange} />}
                    </div>
                </div>

                {/* Rodapé */}
                <div className="px-8 py-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-xl flex justify-between items-center z-20 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
                    <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
                    <div className="flex gap-4">
                        {step > 1 && <Button variant="secondary" onClick={goToPrev}>{t('pagination.previous')}</Button>}
                        <Button variant="primary" onClick={handleSave} isLoading={isSaving} className="gap-2">
                            <Save size={18} /> {t('common.save')}
                        </Button>
                        {step < 7 && (
                            <Button variant="primary" onClick={goToNext} className="group gap-2 px-8">
                                {t('pagination.next')}
                                <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        )}
                    </div>
                </div>

                <ActionModal isOpen={isActionModalOpen} initialData={editingAction} fixedRca={{ id: formData.id, title: formData.what || formData.id || t('analysesPage.newTitle') }} onClose={() => setIsActionModalOpen(false)} onSave={onSaveActionUI} />
                <ConfirmModal isOpen={deleteActionModalOpen} title={t('common.delete')} message={t('modals.deleteActionMessage')} confirmText={t('common.delete')} cancelText={t('common.cancel')} onConfirm={confirmDeleteAction} onCancel={() => { setDeleteActionModalOpen(false); setActionToDelete(null); }} variant="danger" />

            </div>

            <AiSidebar
                isOpen={isAiOpen}
                onClose={() => setAiOpen(false)}
                onOpen={() => setAiOpen(true)}
                rcaData={formData}
                onApplySuggestion={handleApplyAiSuggestion}
            />
        </div>
    );
};

export const RcaEditor: React.FC<RcaEditorProps> = (props) => (
    <AiProvider>
        <RcaEditorContent {...props} />
    </AiProvider>
);
