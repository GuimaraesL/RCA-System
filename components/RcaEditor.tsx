
import React, { useEffect, useState } from 'react';
import { RcaRecord, ActionRecord } from '../types';
import { generateId, getActionsByRca, saveAction, deleteAction } from '../services/storageService';
import { Save, ArrowLeft, Lock, Check } from 'lucide-react';
import { useRcaLogic } from '../hooks/useRcaLogic';
import { ActionModal } from './ActionModal';

// Steps
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
  const {
      step, setStep,
      assets, refreshAssets,
      taxonomy,
      isAnalyzing,
      formData, setFormData,
      handleAssetSelect,
      handleAnalyzeAI,
      handleSave
  } = useRcaLogic(existingRecord || null, onSave);

  // Local state for actions fetched by ID
  const [linkedActions, setLinkedActions] = useState<ActionRecord[]>([]);
  
  // Modal State for Actions
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionRecord | null>(null);

  const refreshActions = () => {
    if (formData.id) {
        setLinkedActions(getActionsByRca(formData.id));
    }
  };

  useEffect(() => {
    if (step === 5 && formData.id) {
        refreshActions();
    }
  }, [step, formData.id]);

  // Generic Field Updater
  const handleChange = (field: string, value: any) => {
      // Handle nested fields: 'equipment.subgroupId' -> formData.equipment.subgroupId
      // But my formData is flat for core fields, nested only for objects like 'five_whys'
      // If field contains dots, handle nesting manually or use setFormData callback
      
      if (field.includes('.')) {
          const parts = field.split('.');
          setFormData(prev => {
              const newData = { ...prev };
              let current: any = newData;
              for (let i = 0; i < parts.length - 1; i++) {
                  current = current[parts[i]];
              }
              current[parts[parts.length - 1]] = value;
              return newData;
          });
      } else {
          setFormData(prev => ({ ...prev, [field]: value }));
      }
  };

  // Action Handlers
  const handleAddAction = () => {
      setEditingAction(null);
      setIsActionModalOpen(true);
  };

  const handleEditAction = (action: ActionRecord) => {
      setEditingAction(action);
      setIsActionModalOpen(true);
  };

  const handleDeleteAction = (id: string) => {
      if(confirm("Are you sure you want to delete this action?")) {
          deleteAction(id);
          refreshActions();
      }
  };

  const handleSaveAction = (action: ActionRecord) => {
      if(!action.id) action.id = generateId('ACT');
      saveAction(action);
      refreshActions();
      setIsActionModalOpen(false);
  };

  const isCompletedStatus = () => {
      const doneStatus = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');
      return doneStatus && formData.status === doneStatus.id;
  };
  const isCompleted = isCompletedStatus();

  // Logic to show Step 6 (Human Reliability)
  const manpowerId = taxonomy.rootCauseMs.find(m => m.name === 'Mão de Obra')?.id;
  const methodId = taxonomy.rootCauseMs.find(m => m.name === 'Método')?.id;

  const showHra = formData.root_causes && formData.root_causes.some(rc => 
      (rc.root_cause_m_id === manpowerId || rc.root_cause_m_id === methodId) && !!rc.root_cause_m_id
  );

  const stepsList = [
      { id: 1, title: 'Dados Gerais', subtitle: 'Informações básicas' },
      { id: 2, title: 'Problema', subtitle: '5W1H' },
      { id: 3, title: 'Análise Técnica', subtitle: 'Impacto e falha' },
      { id: 4, title: 'Investigação', subtitle: '5 Porquês e Ishikawa' },
      { id: 5, title: 'Ações', subtitle: 'Plano de ação' },
      { id: 6, title: 'Checklist', subtitle: 'Manutenção' },
      { id: 7, title: 'Info. Adicionais', subtitle: 'Notas e Comentários' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full w-full max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
        <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-xl font-bold text-slate-800">{formData.what || 'Nova Análise'}</h2>
                <div className="text-xs text-slate-500 flex gap-2">
                    <span className="font-mono">{formData.id}</span>
                    <span>•</span>
                    <span>Ver: {formData.version}</span>
                </div>
            </div>
        </div>
        <div className="flex gap-4 items-center">
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <div className={`relative ${isCompleted ? 'text-green-600' : 'text-slate-700'}`}>
                    <select 
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({...prev, status: e.target.value}))}
                        disabled={isCompleted} 
                        className={`text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer appearance-none pr-6 ${isCompleted ? 'opacity-100' : ''}`}
                    >
                        {isCompleted && <option value={formData.status}>Concluída</option>}
                        {!isCompleted && taxonomy.analysisStatuses.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    {isCompleted && <Lock size={12} className="absolute right-0 top-1/2 -translate-y-1/2" />}
                </div>
            </div>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                <Save size={16} />
                Salvar Registro
            </button>
        </div>
      </div>

      {/* Steps Indicator (New UI) */}
      <div className="px-6 py-6 bg-slate-50 border-b border-slate-200 overflow-x-auto">
        <div className="flex justify-between items-start min-w-[800px]">
            {stepsList.map((s, index) => {
                const isCompleted = step > s.id;
                const isCurrent = step === s.id;
                
                return (
                    <div key={s.id} className="flex-1 flex flex-col items-center relative group cursor-pointer" onClick={() => setStep(s.id)}>
                        {/* Connecting Line */}
                        {index < stepsList.length - 1 && (
                            <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                        
                        <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all z-10
                            ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                              isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' : 
                              'bg-white border-gray-300 text-gray-400 group-hover:border-blue-300'}`}
                        >
                            {isCompleted ? <Check size={16} strokeWidth={3} /> : s.id}
                        </div>
                        <span className={`text-xs font-bold mt-2 transition-colors ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                            {s.title}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium hidden md:block mt-0.5">
                            {s.subtitle}
                        </span>
                    </div>
                );
            })}
        </div>
        
        {/* Conditional HRA Step Indicator */}
        {showHra && (
             <div className="flex justify-center mt-4 pt-4 border-t border-slate-200">
                <button 
                    onClick={() => setStep(8)}
                    className={`text-xs font-bold py-1 px-3 rounded-full flex items-center gap-2 transition-colors border ${
                        step === 8 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                        : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                    }`}
                >
                   <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/> 
                   Análise de Confiabilidade Humana Disponível
                </button>
             </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
        
        {step === 1 && (
            <Step1General 
                data={formData} 
                onChange={handleChange} 
                assets={assets}
                taxonomy={taxonomy}
                onAssetSelect={handleAssetSelect}
                onRefreshAssets={refreshAssets}
            />
        )}

        {step === 2 && (
             <Step2Problem 
                data={formData} 
                onChange={handleChange} 
             />
        )}
        
        {step === 3 && (
             <Step3Technical 
                data={formData} 
                onChange={handleChange} 
                taxonomy={taxonomy}
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

      {/* Action Modal (Inline) */}
      <ActionModal 
        isOpen={isActionModalOpen}
        initialData={editingAction}
        fixedRca={{id: formData.id, title: formData.what}}
        onClose={() => setIsActionModalOpen(false)}
        onSave={handleSaveAction}
      />
    </div>
  );
};
