
import { useState, useEffect } from 'react';
import { RcaRecord, AssetNode, IshikawaDiagram } from '../types';
import { getStandardPrecisionItems, getStandardHraStruct, generateId } from '../services/storageService';
import { analyzeFailure } from '../services/geminiService';
import { useRcaContext } from '../context/RcaContext';

const emptyIshikawa: IshikawaDiagram = {
    machine: [], method: [], material: [], manpower: [], measurement: [], environment: []
};

const createDefaultRecord = (): RcaRecord => ({
    id: generateId('RCA'),
    version: '17.0',
    analysis_date: new Date().toISOString().split('T')[0],
    analysis_duration_minutes: 0,
    analysis_type: '',
    status: 'STATUS-01', // Default to 'Em Aberto' ID if possible, will be resolved by logic
    participants: [],
    facilitator: '',
    
    start_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    requires_operation_support: false,

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
    quality_impacts: '',

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
    lessons_learned: [],
    general_moc_number: ''
});

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
  const { assets, taxonomy, updateRecord, addRecord } = useRcaContext();
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState<RcaRecord>(existingRecord || createDefaultRecord());

  useEffect(() => {
    if (!existingRecord) {
        const newRec = createDefaultRecord();
        if (taxonomy.analysisTypes.length > 0) newRec.analysis_type = taxonomy.analysisTypes[0].id;
        // Default to first status (usually 'Em Aberto')
        if (taxonomy.analysisStatuses.length > 0) newRec.status = taxonomy.analysisStatuses[0].id;
        setFormData(newRec);
    } else {
        // --- Migration Logic ---
        // Merge with default record to ensure all fields exist (prevent undefined errors)
        let migratedRecord = { ...createDefaultRecord(), ...existingRecord };
        const anyRecord = migratedRecord as any;

        // 1. Array-ify Root Causes
        if (!migratedRecord.root_causes) {
             migratedRecord.root_causes = [];
             if (anyRecord.root_cause && anyRecord.root_cause_m_id) {
                 migratedRecord.root_causes.push({
                     id: generateId('RC'),
                     cause: anyRecord.root_cause,
                     root_cause_m_id: anyRecord.root_cause_m_id
                 });
             }
        }

        // 2. Normalize Participants (String -> String[])
        if (typeof migratedRecord.participants === 'string') {
            migratedRecord.participants = (migratedRecord.participants as string)
                .split(',')
                .map(p => p.trim())
                .filter(p => p);
        }

        // 3. Remove Image Fields (Production DTO Constraint)
        if (anyRecord.image_url) {
            delete anyRecord.image_url;
        }

        // 4. Ensure HRA Struct
        if (!migratedRecord.human_reliability) {
            migratedRecord.human_reliability = getStandardHraStruct();
        }

        // 5. Ensure nested objects are not overwritten by undefined spreads if source was partial
        if(!migratedRecord.five_whys) migratedRecord.five_whys = createDefaultRecord().five_whys;
        if(!migratedRecord.ishikawa) migratedRecord.ishikawa = emptyIshikawa;
        if(!migratedRecord.precision_maintenance) migratedRecord.precision_maintenance = getStandardPrecisionItems();
        if(!migratedRecord.containment_actions) migratedRecord.containment_actions = [];
        if(!migratedRecord.lessons_learned) migratedRecord.lessons_learned = [];

        setFormData(migratedRecord);
    }
  }, [existingRecord]);

  // --- Strict Validation Logic ---
  useEffect(() => {
    // Define all fields that MUST be present for a "Completed" analysis
    const mandatoryStrings = [
        formData.analysis_type,
        formData.what,
        formData.problem_description,
        formData.asset_name_display,
        formData.who,
        formData.when,
        formData.where_description,
        formData.specialty_id,
        formData.failure_mode_id,
        formData.failure_category_id,
        formData.component_type
    ];

    const stringsOk = mandatoryStrings.every(s => s && s.trim().length > 0);
    const participantsOk = formData.participants && formData.participants.length > 0;
    const rootCausesOk = formData.root_causes && formData.root_causes.length > 0;
    
    // Impact fields must be numbers (0 is allowed, but not undefined/null)
    const impactsOk = (formData.financial_impact !== undefined && formData.financial_impact !== null) &&
                      (formData.downtime_minutes !== undefined && formData.downtime_minutes !== null);

    const isComplete = stringsOk && participantsOk && rootCausesOk && impactsOk;

    // Resolve IDs from Taxonomy
    const doneStatusItem = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');
    const openStatusItem = taxonomy.analysisStatuses.find(s => s.name === 'Em Aberto');
    
    const doneStatusId = doneStatusItem ? doneStatusItem.id : 'STATUS-DONE';
    const openStatusId = openStatusItem ? openStatusItem.id : 'STATUS-01';

    // Enforcement Logic
    if (isComplete) {
        // Option A: Auto-complete. If user fills everything, we mark it as Done.
        // Option B: Just allow it.
        // Based on user request "APLICAR A NOSSA LOGICA DE ANALISE CONCLUIDA", we assume automatic completion logic or at least validation check.
        // We will NOT auto-set to Done to avoid UX jumping, but we allow it.
        // However, if it WAS in a "Draft" or "Open" state and acts as "Completed" logic, some systems auto-promote.
        // Let's stick to: It is valid to be Done.
    } else {
        // If incomplete, it CANNOT be "Concluída". Downgrade to "Em Aberto".
        if (formData.status === doneStatusId) {
             console.warn("Downgrading status to Open due to missing fields.");
             setFormData(prev => ({ ...prev, status: openStatusId }));
        }
    }
  }, [
    // Dependency array listing all validated fields to trigger check on any change
    formData.analysis_type, 
    formData.what, 
    formData.problem_description, 
    formData.asset_name_display,
    formData.who,
    formData.when,
    formData.where_description,
    formData.specialty_id,
    formData.failure_mode_id,
    formData.failure_category_id,
    formData.component_type,
    formData.participants,
    formData.root_causes,
    formData.financial_impact,
    formData.downtime_minutes,
    formData.status,
    taxonomy.analysisStatuses
  ]);

  const refreshAssets = () => {
      // Context handles asset syncing automatically
  };

  const handleAssetSelect = (asset: AssetNode) => {
    const path = findAssetPath(assets, asset.id);
    const update: Partial<RcaRecord> = { 
        asset_name_display: asset.name,
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
    if (existingRecord) {
        updateRecord(formData);
    } else {
        addRecord(formData);
    }
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
