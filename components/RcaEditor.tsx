
import React, { useEffect, useState } from 'react';
import { RcaRecord, IshikawaDiagram, PrecisionStatus, ActionRecord, HraConclusion } from '../types';
import { AssetSelector } from './AssetSelector';
import { generateId, getActionsByRca, saveAction, deleteAction } from '../services/storageService';
import { Save, Wand2, ArrowLeft, Loader2, Plus, Trash2, CheckSquare, Square, XSquare, RefreshCw, AlertTriangle, Lock, Edit2, UserCheck, MessageSquare } from 'lucide-react';
import { useRcaLogic } from '../hooks/useRcaLogic';
import { ActionModal } from './ActionModal';

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

  const updateFiveWhy = (index: number, field: 'why_question' | 'answer', value: string) => {
      const newWhys = [...formData.five_whys];
      newWhys[index] = { ...newWhys[index], [field]: value };
      setFormData(prev => ({ ...prev, five_whys: newWhys }));
  };

  const updatePrecision = (id: number, field: 'status' | 'comment', value: any) => {
      const newItems = formData.precision_maintenance.map(item => 
          item.id === id ? { ...item, [field]: value } : item
      );
      setFormData(prev => ({ ...prev, precision_maintenance: newItems }));
  };

  const updateHraQuestion = (id: string, field: 'answer' | 'comment', value: any) => {
      if (!formData.human_reliability) return;
      const newQuestions = formData.human_reliability.questions.map(q => 
          q.id === id ? { ...q, [field]: value } : q
      );
      setFormData(prev => ({ ...prev, human_reliability: { ...prev.human_reliability!, questions: newQuestions } }));
  };

  const updateHraConclusion = (id: string, field: 'selected' | 'description', value: any) => {
     if (!formData.human_reliability) return;
     const newConclusions = formData.human_reliability.conclusions.map(c => 
         c.id === id ? { ...c, [field]: value } : c
     );
     setFormData(prev => ({ ...prev, human_reliability: { ...prev.human_reliability!, conclusions: newConclusions } }));
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

  // Root Cause Handlers (Multi-Row)
  const addRootCause = () => {
      setFormData(prev => ({
          ...prev,
          root_causes: [...(prev.root_causes || []), { id: generateId('RC'), root_cause_m_id: '', cause: '' }]
      }));
  };

  const removeRootCause = (idx: number) => {
      const newList = [...formData.root_causes];
      newList.splice(idx, 1);
      setFormData(prev => ({ ...prev, root_causes: newList }));
  };

  const updateRootCause = (idx: number, field: 'root_cause_m_id' | 'cause', value: string) => {
      const newList = [...formData.root_causes];
      newList[idx] = { ...newList[idx], [field]: value };
      setFormData(prev => ({ ...prev, root_causes: newList }));
  };

  const isCompletedStatus = () => {
      const doneStatus = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');
      return doneStatus && formData.status === doneStatus.id;
  };
  const isCompleted = isCompletedStatus();

  // Logic to show Step 6 (Human Reliability)
  // Check against ID for Method and Manpower in ANY of the root causes
  const manpowerId = taxonomy.rootCauseMs.find(m => m.name === 'Mão de Obra')?.id;
  const methodId = taxonomy.rootCauseMs.find(m => m.name === 'Método')?.id;

  const showHra = formData.root_causes && formData.root_causes.some(rc => 
      (rc.root_cause_m_id === manpowerId || rc.root_cause_m_id === methodId) && !!rc.root_cause_m_id
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full w-full max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-xl font-bold text-slate-800">{formData.what || 'New Analysis'}</h2>
                <div className="text-xs text-slate-500 flex gap-2">
                    <span className="font-mono">{formData.id}</span>
                    <span>•</span>
                    <span>Ver: {formData.version}</span>
                </div>
            </div>
        </div>
        <div className="flex gap-4 items-center">
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Analysis Status</label>
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
                Save Record
            </button>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="px-6 py-0 bg-slate-50 border-b border-slate-100 flex overflow-x-auto">
        {['1. Definition', '2. Problem', '3. Investigation', '4. Precision', '5. Actions'].map((label, idx) => (
            <button 
                key={label}
                onClick={() => setStep(idx + 1)}
                className={`text-sm font-medium py-3 px-6 border-b-2 transition-colors text-center whitespace-nowrap ${
                    step === idx + 1 ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
                {label}
            </button>
        ))}
        {showHra && (
            <button 
                onClick={() => setStep(6)}
                className={`text-sm font-medium py-3 px-6 border-b-2 transition-colors text-center whitespace-nowrap flex items-center gap-2 ${
                    step === 6 ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-indigo-400 hover:text-indigo-600'
                }`}
            >
                <UserCheck size={14} /> 6. Human Reliability
            </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
        
        {/* STEP 1: DEFINITION */}
        {step === 1 && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">0. Componente / Localização</h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                             <div className="flex justify-between items-end mb-1">
                                <label className="block text-xs font-medium text-slate-500">Asset Selector (Select Subgroup) <span className="text-red-500">*</span></label>
                                <span className="text-[10px] text-blue-500 cursor-pointer" onClick={refreshAssets} title="Refresh Assets"><RefreshCw size={10}/> Refresh</span>
                             </div>
                             <div className="border rounded h-48 overflow-auto mb-2 bg-slate-50">
                                <AssetSelector 
                                    assets={assets} 
                                    onSelect={handleAssetSelect} 
                                    selectedAssetId={formData.subgroup_id}
                                    selectableTypes={['SUBGROUP']} 
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-slate-400 block text-xs">Equipment ID (Auto)</span>{formData.equipment_id || '-'}</div>
                                <div><span className="text-slate-400 block text-xs">Subgroup ID (Selected)</span>{formData.subgroup_id || '-'}</div>
                             </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Component Type (Conforme lista)</label>
                                <select 
                                  className="w-full border p-2 rounded text-sm bg-white"
                                  value={formData.component_type}
                                  onChange={e => setFormData(prev => ({...prev, component_type: e.target.value}))}
                                >
                                  <option value="">Select Type...</option>
                                  {taxonomy.componentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Failure Date</label>
                                    <input type="date" className="w-full border p-2 rounded text-sm" value={formData.failure_date} onChange={e => setFormData(prev => ({...prev, failure_date: e.target.value}))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                                    <input type="time" className="w-full border p-2 rounded text-sm" value={formData.failure_time} onChange={e => setFormData(prev => ({...prev, failure_time: e.target.value}))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Downtime (min)</label>
                                    <input type="number" className="w-full border p-2 rounded text-sm" value={formData.downtime_minutes} onChange={e => setFormData(prev => ({...prev, downtime_minutes: Number(e.target.value)}))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Impact ($)</label>
                                    <input type="number" className="w-full border p-2 rounded text-sm" value={formData.financial_impact} onChange={e => setFormData(prev => ({...prev, financial_impact: Number(e.target.value)}))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">OS Number</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.os_number} onChange={e => setFormData(prev => ({...prev, os_number: e.target.value}))} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">Analysis Metadata</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Analysis Type <span className="text-red-500">*</span></label>
                            <select 
                                className="w-full border p-2 rounded text-sm bg-white" 
                                value={formData.analysis_type} 
                                onChange={e => setFormData(prev => ({...prev, analysis_type: e.target.value}))}
                            >
                                <option value="">Select...</option>
                                {taxonomy.analysisTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Facilitator</label>
                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.facilitator} onChange={e => setFormData(prev => ({...prev, facilitator: e.target.value}))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Participants <span className="text-red-500">*</span></label>
                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.participants} onChange={e => setFormData(prev => ({...prev, participants: e.target.value}))} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: PROBLEM */}
        {step === 2 && (
             <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">1. Descrição do Problema (5W2H)</h3>
                    <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">What (Short Title) <span className="text-red-500">*</span></label>
                            <input type="text" className="w-full border p-2 rounded text-sm font-medium" value={formData.what} onChange={e => setFormData(prev => ({...prev, what: e.target.value}))} placeholder="e.g. Falha no drive da bomba" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Who (Detected By)</label>
                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.who} onChange={e => setFormData(prev => ({...prev, who: e.target.value}))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">When (Detailed Timing)</label>
                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.when} onChange={e => setFormData(prev => ({...prev, when: e.target.value}))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Where (Location Detail)</label>
                            <input type="text" className="w-full border p-2 rounded text-sm" value={formData.where_description} onChange={e => setFormData(prev => ({...prev, where_description: e.target.value}))} />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Full Problem Description <span className="text-red-500">*</span></label>
                        <textarea className="w-full border p-2 rounded text-sm h-24" value={formData.problem_description} onChange={e => setFormData(prev => ({...prev, problem_description: e.target.value}))} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Potential Impacts (Safety, Environment, etc)</label>
                        <textarea className="w-full border p-2 rounded text-sm h-16" value={formData.potential_impacts} onChange={e => setFormData(prev => ({...prev, potential_impacts: e.target.value}))} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">Classificação</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Specialty</label>
                            <select className="w-full border p-2 rounded text-sm bg-white" value={formData.specialty_id} onChange={e => setFormData(prev => ({...prev, specialty_id: e.target.value}))}>
                              <option value="">Select Specialty...</option>
                              {taxonomy.specialties.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Failure Mode</label>
                            <select className="w-full border p-2 rounded text-sm bg-white" value={formData.failure_mode_id} onChange={e => setFormData(prev => ({...prev, failure_mode_id: e.target.value}))}>
                              <option value="">Select Failure Mode...</option>
                              {taxonomy.failureModes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Failure Category</label>
                            <select className="w-full border p-2 rounded text-sm bg-white" value={formData.failure_category_id} onChange={e => setFormData(prev => ({...prev, failure_category_id: e.target.value}))}>
                              <option value="">Select Category...</option>
                              {taxonomy.failureCategories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* STEP 3: INVESTIGATION */}
        {step === 3 && (
             <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                     <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">4. 5 Whys Analysis</h3>
                     <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 mb-1">
                            <div className="col-span-1">Level</div>
                            <div className="col-span-5">Why? (Question)</div>
                            <div className="col-span-6">Because... (Answer)</div>
                        </div>
                        {formData.five_whys.map((w, idx) => (
                             <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-1 text-center font-bold text-slate-300 text-lg">{idx + 1}</div>
                                <div className="col-span-5"><input type="text" className="w-full border p-2 rounded text-sm" value={w.why_question} onChange={e => updateFiveWhy(idx, 'why_question', e.target.value)} placeholder={`Why...`} /></div>
                                <div className="col-span-6"><input type="text" className="w-full border p-2 rounded text-sm" value={w.answer} onChange={e => updateFiveWhy(idx, 'answer', e.target.value)} placeholder="Because..." /></div>
                             </div>
                        ))}
                     </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6 border-b pb-2">
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">3. Causa e Efeito (Ishikawa)</h3>
                         <button onClick={handleAnalyzeAI} disabled={isAnalyzing || !formData.problem_description} className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded font-medium flex items-center gap-1 transition-colors">{isAnalyzing ? <Loader2 className="animate-spin" size={12}/> : <Wand2 size={12}/>} Generate with Gemini</button>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        {(Object.keys(formData.ishikawa) as Array<keyof IshikawaDiagram>).map((category) => (
                            <div key={category} className={`bg-slate-50 p-4 rounded border ${((category === 'method' || category === 'manpower') && formData.ishikawa[category].length > 0) ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'}`}>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 text-center flex items-center justify-center gap-1">
                                    {category} 
                                </h4>
                                <ul className="space-y-2 min-h-[100px]">
                                    {formData.ishikawa[category].map((item, i) => (
                                        <li key={i} className="text-sm bg-white p-2 rounded border border-slate-200 shadow-sm flex justify-between group">
                                            <span>{item}</span>
                                            <button onClick={() => { const newArr = [...formData.ishikawa[category]]; newArr.splice(i, 1); setFormData(prev => ({...prev, ishikawa: {...formData.ishikawa, [category]: newArr}})); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                        </li>
                                    ))}
                                    <li>
                                        <input type="text" placeholder="Add cause..." className="w-full text-xs bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none p-1" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) { setFormData(prev => ({...prev, ishikawa: {...formData.ishikawa, [category]: [...formData.ishikawa[category], e.currentTarget.value]}})); e.currentTarget.value = ''; } }} />
                                    </li>
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-green-500">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">5. Causa Raiz Validada (Root Causes) <span className="text-red-500">*</span></h3>
                        <button onClick={addRootCause} className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1 rounded font-bold flex items-center gap-1"><Plus size={14}/> ADD ROOT CAUSE</button>
                     </div>
                     
                     <div className="space-y-3">
                        {formData.root_causes.length === 0 && <p className="text-sm text-slate-400 italic text-center p-4">No root causes defined. Click "Add Root Cause".</p>}
                        
                        {formData.root_causes.map((rc, idx) => (
                            <div key={rc.id} className="grid grid-cols-12 gap-4 items-start bg-slate-50 p-3 rounded-lg border border-slate-100 group">
                                <div className="col-span-3">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">M Category</label>
                                    <select 
                                        className="w-full border p-2 rounded text-sm bg-white"
                                        value={rc.root_cause_m_id}
                                        onChange={e => updateRootCause(idx, 'root_cause_m_id', e.target.value)}
                                    >
                                        <option value="">Select M...</option>
                                        {taxonomy.rootCauseMs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-8">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Specific Root Cause Description</label>
                                    <input 
                                        type="text" 
                                        className="w-full border p-2 rounded text-sm text-slate-800 font-medium" 
                                        value={rc.cause} 
                                        onChange={e => updateRootCause(idx, 'cause', e.target.value)} 
                                        placeholder="Conclusion of investigation..." 
                                    />
                                </div>
                                <div className="col-span-1 flex justify-center pt-6">
                                    <button onClick={() => removeRootCause(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                     </div>
                     
                     {showHra && (
                        <div className="mt-4 p-3 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100 flex items-center gap-2 animate-in fade-in">
                            <UserCheck size={14} />
                            <span>One or more Root Causes identified as <strong>Method</strong> or <strong>Manpower</strong>. The <strong>Human Reliability Analysis</strong> tab (Step 6) is now available.</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* STEP 4: PRECISION */}
        {step === 4 && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                        <div className="bg-amber-100 p-2 rounded text-amber-600"><CheckSquare size={24}/></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">3. Manutenção de Precisão</h3>
                            <p className="text-sm text-slate-500">Check list de verificação para restaurar a condição básica. <span className="italic">A ser revisada durante a reunião diária de manutenção.</span></p>
                        </div>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b">
                                <th className="p-3 w-10 text-center">#</th>
                                <th className="p-3 w-1/3">Atividade</th>
                                <th className="p-3 w-24 text-center">Executado</th>
                                <th className="p-3 w-24 text-center">Não Exec.</th>
                                <th className="p-3 w-24 text-center">N/A</th>
                                <th className="p-3">Comentário</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formData.precision_maintenance.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="p-3 text-center text-slate-400">{item.id}</td>
                                    <td className="p-3 font-medium text-slate-700">{item.activity}</td>
                                    <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'EXECUTED')} className={`p-1 rounded ${item.status === 'EXECUTED' ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}>{item.status === 'EXECUTED' ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                    <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'NOT_EXECUTED')} className={`p-1 rounded ${item.status === 'NOT_EXECUTED' ? 'text-red-500 bg-red-50' : 'text-slate-300'}`}>{item.status === 'NOT_EXECUTED' ? <XSquare size={18} /> : <Square size={18} />}</button></td>
                                    <td className="p-3 text-center"><button onClick={() => updatePrecision(item.id, 'status', 'NOT_APPLICABLE')} className={`p-1 rounded ${item.status === 'NOT_APPLICABLE' ? 'text-slate-500 bg-slate-100' : 'text-slate-300'}`}>{item.status === 'NOT_APPLICABLE' ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                    <td className="p-3">
                                        <input 
                                            type="text" 
                                            className="w-full border-b border-slate-200 focus:border-blue-500 outline-none bg-transparent text-xs py-1" 
                                            placeholder="Add comment..." 
                                            value={item.comment || ''} 
                                            onChange={(e) => updatePrecision(item.id, 'comment', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* STEP 5: ACTIONS */}
        {step === 5 && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Containment */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">2. Ação de Contenção (Imediata)</h3>
                         <button onClick={() => setFormData(prev => ({...prev, containment_actions: [...formData.containment_actions, {id: generateId('ACT'), action: '', responsible: '', date: '', status: ''}]}))} className="text-blue-600 text-xs font-bold flex items-center gap-1"><Plus size={14}/> ADD</button>
                    </div>
                    {formData.containment_actions.map((act, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                            <input type="text" className="col-span-6 border p-2 rounded text-sm" placeholder="Action" value={act.action} onChange={e => {
                                const list = [...formData.containment_actions]; list[idx].action = e.target.value; setFormData(prev => ({...prev, containment_actions: list}));
                            }}/>
                            <input type="text" className="col-span-3 border p-2 rounded text-sm" placeholder="Responsible" value={act.responsible} onChange={e => {
                                const list = [...formData.containment_actions]; list[idx].responsible = e.target.value; setFormData(prev => ({...prev, containment_actions: list}));
                            }}/>
                            <input type="date" className="col-span-2 border p-2 rounded text-sm" value={act.date} onChange={e => {
                                const list = [...formData.containment_actions]; list[idx].date = e.target.value; setFormData(prev => ({...prev, containment_actions: list}));
                            }}/>
                            <div className="col-span-1 text-center">
                                <button onClick={() => {
                                    const list = [...formData.containment_actions]; list.splice(idx, 1); setFormData(prev => ({...prev, containment_actions: list}));
                                }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    {formData.containment_actions.length === 0 && <p className="text-xs text-slate-400 italic">No containment actions recorded.</p>}
                </div>

                {/* Corrective */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 relative">
                     {/* BOX LEGEND */}
                     <div className="absolute top-4 right-6 flex gap-2 text-[10px] font-bold text-slate-500 border border-slate-200 rounded p-1.5 bg-slate-50">
                        <div className="flex flex-col items-center px-2 border-r border-slate-200"><span>1</span><span>Aprovada</span></div>
                        <div className="flex flex-col items-center px-2 border-r border-slate-200"><span>2</span><span>Em Andamento</span></div>
                        <div className="flex flex-col items-center px-2 border-r border-slate-200"><span>3</span><span>Concluída</span></div>
                        <div className="flex flex-col items-center px-2"><span>4</span><span>Ef. Comprovada</span></div>
                     </div>

                     <div className="flex justify-between items-center mb-4 border-b pb-2 pr-48">
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">7. Plano de Ação (Corretiva)</h3>
                         <button onClick={handleAddAction} className="text-blue-600 text-xs font-bold flex items-center gap-1"><Plus size={14}/> ADD ACTION PLAN</button>
                    </div>
                     
                    {/* LINKED TABLE */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-2">Box</th>
                                    <th className="px-4 py-2 w-1/2">Action</th>
                                    <th className="px-4 py-2">Responsible</th>
                                    <th className="px-4 py-2">Due Date</th>
                                    <th className="px-4 py-2 text-right">Manage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {linkedActions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-slate-400 italic bg-slate-50/50">
                                            No linked action plans. Click "Add Action Plan" to create one for this analysis.
                                        </td>
                                    </tr>
                                )}
                                {linkedActions.map(act => (
                                    <tr key={act.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-bold text-center border-r border-slate-100 bg-slate-50/50 w-16">{act.status}</td>
                                        <td className="px-4 py-2">{act.action}</td>
                                        <td className="px-4 py-2">{act.responsible}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{act.date}</td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEditAction(act)} className="text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDeleteAction(act.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                 {/* Lessons */}
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                     <div className="flex justify-between items-center mb-4 border-b pb-2">
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">8. Lições Aprendidas</h3>
                         <button onClick={() => setFormData(prev => ({...prev, lessons_learned: [...formData.lessons_learned, '']}))} className="text-blue-600 text-xs font-bold flex items-center gap-1"><Plus size={14}/> ADD</button>
                    </div>
                    {formData.lessons_learned.map((lesson, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                            <input type="text" className="w-full border p-2 rounded text-sm" value={lesson} onChange={e => {
                                const list = [...formData.lessons_learned]; list[idx] = e.target.value; setFormData(prev => ({...prev, lessons_learned: list}));
                            }}/>
                            <button onClick={() => {
                                    const list = [...formData.lessons_learned]; list.splice(idx, 1); setFormData(prev => ({...prev, lessons_learned: list}));
                                }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                 </div>
            </div>
        )}

        {/* STEP 6: HUMAN RELIABILITY ANALYSIS */}
        {step === 6 && formData.human_reliability && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex gap-3 text-indigo-700 text-sm">
                    <UserCheck size={20} className="mt-0.5" />
                    <div>
                        <strong>Human Reliability Analysis (HRA)</strong>
                        <p>Explore losses related to "Method" and "Manpower" to identify potential human errors.</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="grid grid-cols-4 gap-6 mb-6 text-sm text-slate-600 border-b pb-4">
                        <div><span className="block text-xs text-slate-400 uppercase">RCA ID</span>{formData.id}</div>
                        <div><span className="block text-xs text-slate-400 uppercase">Responsible</span>{formData.facilitator || '-'}</div>
                        <div><span className="block text-xs text-slate-400 uppercase">Asset</span>{formData.asset_name_display || '-'}</div>
                        <div><span className="block text-xs text-slate-400 uppercase">Date</span>{formData.analysis_date}</div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Questionnaire</h3>
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b">
                                <th className="p-3 w-16">ID</th>
                                <th className="p-3">Question</th>
                                <th className="p-3 w-24 text-center">Yes</th>
                                <th className="p-3 w-24 text-center">No</th>
                                <th className="p-3 w-1/3">Comments</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formData.human_reliability.questions.map(q => (
                                <tr key={q.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono text-xs text-slate-400">{q.id}</td>
                                    <td className="p-3">
                                        <div className="text-xs text-slate-400 mb-1 font-bold uppercase">{q.category}</div>
                                        {q.question}
                                    </td>
                                    <td className="p-3 text-center"><button onClick={() => updateHraQuestion(q.id, 'answer', 'YES')} className={`p-1 rounded ${q.answer === 'YES' ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}>{q.answer === 'YES' ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                    <td className="p-3 text-center"><button onClick={() => updateHraQuestion(q.id, 'answer', 'NO')} className={`p-1 rounded ${q.answer === 'NO' ? 'text-red-500 bg-red-50' : 'text-slate-300'}`}>{q.answer === 'NO' ? <XSquare size={18} /> : <Square size={18} />}</button></td>
                                    <td className="p-3">
                                        <input type="text" className="w-full border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent text-xs py-1" placeholder="Add comment..." value={q.comment} onChange={e => updateHraQuestion(q.id, 'comment', e.target.value)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">8. Conclusion (Possible Causes)</h3>
                    <p className="text-sm text-slate-500 mb-6">Considering all analyses A3 made so far and the human reliability analysis, which of the items below are considered possible causes related to the human factor?</p>
                    
                    <div className="space-y-4">
                        {formData.human_reliability.conclusions.map(c => (
                            <div key={c.id} className={`p-4 rounded border ${c.selected ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <button onClick={() => updateHraConclusion(c.id, 'selected', !c.selected)} className={c.selected ? 'text-indigo-600' : 'text-slate-300'}>
                                        {c.selected ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </button>
                                    <span className={`font-bold text-sm ${c.selected ? 'text-indigo-800' : 'text-slate-700'}`}>{c.label}</span>
                                </div>
                                {c.selected && (
                                    <div className="pl-8 animate-in fade-in slide-in-from-top-1">
                                        <textarea 
                                            placeholder="Descreva brevemente..." 
                                            className="w-full border p-2 rounded text-sm h-16"
                                            value={c.description}
                                            onChange={e => updateHraConclusion(c.id, 'description', e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">7.1 Validation</h3>
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">O coordenador da máquina valida a análise realizada?</label>
                            <div className="flex gap-4 mt-2">
                                <button 
                                    onClick={() => setFormData(prev => ({...prev, human_reliability: {...prev.human_reliability!, validation: {...prev.human_reliability!.validation, isValidated: 'YES'}} }))} 
                                    className={`flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium ${formData.human_reliability.validation.isValidated === 'YES' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-300 text-slate-600'}`}
                                >
                                    <CheckSquare size={16}/> YES
                                </button>
                                <button 
                                    onClick={() => setFormData(prev => ({...prev, human_reliability: {...prev.human_reliability!, validation: {...prev.human_reliability!.validation, isValidated: 'NO'}} }))}
                                    className={`flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium ${formData.human_reliability.validation.isValidated === 'NO' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-300 text-slate-600'}`}
                                >
                                    <XSquare size={16}/> NO
                                </button>
                            </div>
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Comentários do Coordenador</label>
                            <textarea 
                                className="w-full border p-2 rounded text-sm h-20" 
                                value={formData.human_reliability.validation.comment}
                                onChange={e => setFormData(prev => ({...prev, human_reliability: {...prev.human_reliability!, validation: {...prev.human_reliability!.validation, comment: e.target.value}} }))}
                            />
                        </div>
                    </div>
                </div>
            </div>
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
