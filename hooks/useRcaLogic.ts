
import { useState, useEffect } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig, IshikawaDiagram } from '../types';
import { getAssets, getTaxonomy, saveRecord, getStandardPrecisionItems, generateId } from '../services/storageService';
import { analyzeFailure } from '../services/geminiService';

const emptyIshikawa: IshikawaDiagram = {
    machine: [], method: [], material: [], manpower: [], measurement: [], environment: []
};

const createDefaultRecord = (): RcaRecord => ({
    id: generateId('RCA'),
    version: '17.0',
    analysis_date: new Date().toISOString().split('T')[0],
    analysis_duration_minutes: 0,
    analysis_type: '',
    status: 'Em Aberto',
    participants: '',
    facilitator: '',
    
    failure_date: new Date().toISOString().split('T')[0],
    failure_time: '00:00',
    downtime_minutes: 0,
    financial_impact: 0,
    os_number: '',

    area_id: '',
    equipment_id: '',
    subgroup_id: '',
    component_type: '',
    asset_name_display: '',

    specialty_id: '',
    failure_mode_id: '',
    failure_category_id: '',

    who: '',
    what: '',
    when: '',
    where_description: '',
    problem_description: '',
    potential_impacts: '',
    image_url: '',

    five_whys: [
        { id: '1', why_question: '', answer: '' },
        { id: '2', why_question: '', answer: '' },
        { id: '3', why_question: '', answer: '' },
        { id: '4', why_question: '', answer: '' },
        { id: '5', why_question: '', answer: '' }
    ],
    ishikawa: emptyIshikawa,
    root_cause: '',

    precision_maintenance: getStandardPrecisionItems(),

    containment_actions: [],
    lessons_learned: []
});

export const useRcaLogic = (existingRecord: RcaRecord | null, onSaveCallback: () => void) => {
  const [step, setStep] = useState(1);
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig>({
      analysisTypes: [], analysisStatuses: [], specialties: [], failureModes: [], failureCategories: [], componentTypes: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState<RcaRecord>(existingRecord || createDefaultRecord());

  useEffect(() => {
    // Load fresh data on mount or when existingRecord changes
    const freshAssets = getAssets();
    setAssets(freshAssets);
    
    const tax = getTaxonomy();
    setTaxonomy(tax);

    if (!existingRecord) {
        // Reset to default if creating new
        const newRec = createDefaultRecord();
        if (tax.analysisTypes.length > 0) newRec.analysis_type = tax.analysisTypes[0].id;
        if (tax.analysisStatuses.length > 0) newRec.status = tax.analysisStatuses[0].id;
        setFormData(newRec);
    } else {
        setFormData(existingRecord);
    }
  }, [existingRecord]);

  // Validation Effect for Automatic Status
  useEffect(() => {
    const requiredFields = [
        formData.analysis_type,
        formData.what,
        formData.problem_description,
        formData.root_cause,
        formData.participants,
        formData.asset_name_display
    ];
    
    const isComplete = requiredFields.every(field => field && field.trim().length > 0);

    const doneStatusItem = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');
    const doneStatusId = doneStatusItem ? doneStatusItem.id : 'Concluída';

    if (isComplete) {
        if (formData.status !== doneStatusId) {
            setFormData(prev => ({ ...prev, status: doneStatusId }));
        }
    } else {
        // If incomplete, do not force a status, but if it WAS 'Concluída', revert to default or leave as is if user set it?
        // Logic: The status MUST be 'Concluída' IF complete. 
        // If not complete, user can choose any status EXCEPT 'Concluída' (handled in UI)
        // For now, if it becomes incomplete but was 'Concluída', we switch it to 'Em Andamento' (if available) or the first default.
        if (formData.status === doneStatusId) {
            const defaultStatusItem = taxonomy.analysisStatuses[0];
            const defaultStatusId = defaultStatusItem ? defaultStatusItem.id : 'Em Andamento';
            setFormData(prev => ({ ...prev, status: defaultStatusId }));
        }
    }
  }, [
    formData.analysis_type, 
    formData.what, 
    formData.problem_description, 
    formData.root_cause, 
    formData.participants,
    formData.asset_name_display,
    formData.status,
    taxonomy.analysisStatuses
  ]);

  const refreshAssets = () => {
      setAssets(getAssets());
  };

  const handleAssetSelect = (asset: AssetNode) => {
    let update = { asset_name_display: asset.name };
    if (asset.type === 'AREA') update = { ...update, area_id: asset.id } as any;
    if (asset.type === 'EQUIPMENT') update = { ...update, equipment_id: asset.id } as any;
    if (asset.type === 'SUBGROUP') update = { ...update, subgroup_id: asset.id } as any;
    
    setFormData(prev => ({ ...prev, ...update }));
  };

  const handleAnalyzeAI = async () => {
    if (!formData.asset_name_display || !formData.problem_description) return;
    setIsAnalyzing(true);
    const diagram = await analyzeFailure(formData.asset_name_display, formData.problem_description);
    if (diagram) {
      setFormData(prev => ({
        ...prev,
        ishikawa: diagram
      }));
    }
    setIsAnalyzing(false);
  };

  const handleSave = () => {
    saveRecord(formData);
    onSaveCallback();
  };

  return {
      step, setStep,
      assets, refreshAssets,
      taxonomy,
      isAnalyzing,
      formData, setFormData,
      handleAssetSelect,
      handleAnalyzeAI,
      handleSave
  };
};