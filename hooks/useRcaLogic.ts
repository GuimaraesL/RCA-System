
import { useState, useEffect } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig, IshikawaDiagram } from '../types';
import { getAssets, getTaxonomy, saveRecord, getStandardPrecisionItems, getStandardHraStruct, generateId } from '../services/storageService';
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
    
    root_causes: [],

    precision_maintenance: getStandardPrecisionItems(),
    
    human_reliability: getStandardHraStruct(),

    containment_actions: [],
    lessons_learned: []
});

// Helper to find full path to a node for ID resolution
const findAssetPath = (nodes: AssetNode[], targetId: string): AssetNode[] | null => {
    for (const node of nodes) {
        if (node.id === targetId) return [node];
        if (node.children) {
            const path = findAssetPath(node.children, targetId);
            if (path) return [node, ...path];
        }
    }
    return null;
};

export const useRcaLogic = (existingRecord: RcaRecord | null, onSaveCallback: () => void) => {
  const [step, setStep] = useState(1);
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig>({
      analysisTypes: [], analysisStatuses: [], specialties: [], failureModes: [], failureCategories: [], componentTypes: [], rootCauseMs: []
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
        // --- Migration Logic for Legacy Fields ---
        let migratedRecord = { ...existingRecord };

        // Ensure root_causes array exists
        if (!migratedRecord.root_causes) {
             migratedRecord.root_causes = [];
             // If legacy fields exist, migrate them to the first array item
             const legacyRecord = existingRecord as any;
             if (legacyRecord.root_cause && legacyRecord.root_cause_m_id) {
                 migratedRecord.root_causes.push({
                     id: generateId('RC'),
                     cause: legacyRecord.root_cause,
                     root_cause_m_id: legacyRecord.root_cause_m_id
                 });
             }
        }

        // Ensure HRA struct exists
        if (!migratedRecord.human_reliability) {
            migratedRecord.human_reliability = getStandardHraStruct();
        }

        setFormData(migratedRecord);
    }
  }, [existingRecord]);

  // Validation Effect for Automatic Status
  useEffect(() => {
    const requiredFields = [
        formData.analysis_type,
        formData.what,
        formData.problem_description,
        formData.participants,
        formData.asset_name_display
    ];
    
    const basicFieldsComplete = requiredFields.every(field => field && field.trim().length > 0);
    const hasRootCause = formData.root_causes && formData.root_causes.length > 0;
    
    const isComplete = basicFieldsComplete && hasRootCause;

    const doneStatusItem = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');
    const doneStatusId = doneStatusItem ? doneStatusItem.id : 'Concluída';

    if (isComplete) {
        if (formData.status !== doneStatusId) {
            setFormData(prev => ({ ...prev, status: doneStatusId }));
        }
    } else {
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
    formData.root_causes,
    formData.participants,
    formData.asset_name_display,
    formData.status,
    taxonomy.analysisStatuses
  ]);

  const refreshAssets = () => {
      setAssets(getAssets());
  };

  const handleAssetSelect = (asset: AssetNode) => {
    // Traverse tree to find full path (Area -> Equipment -> Subgroup)
    const path = findAssetPath(assets, asset.id);
    
    const update: Partial<RcaRecord> = { 
        asset_name_display: asset.name,
        // Reset IDs to ensure we don't keep stale ones if moving branches
        area_id: '',
        equipment_id: '',
        subgroup_id: ''
    };

    if (path) {
        path.forEach(node => {
            if (node.type === 'AREA') update.area_id = node.id;
            if (node.type === 'EQUIPMENT') update.equipment_id = node.id;
            if (node.type === 'SUBGROUP') update.subgroup_id = node.id;
        });
    } else {
        // Fallback (should not happen if asset comes from the tree)
        if (asset.type === 'AREA') update.area_id = asset.id;
        if (asset.type === 'EQUIPMENT') update.equipment_id = asset.id;
        if (asset.type === 'SUBGROUP') update.subgroup_id = asset.id;
    }
    
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
