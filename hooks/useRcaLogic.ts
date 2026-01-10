
import { useState, useEffect } from 'react';
import { RcaRecord, AssetNode, IshikawaDiagram } from '../types';
import { getStandardPrecisionItems, getStandardHraStruct, generateId } from '../services/utils';
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
    status: '', // Will be set by taxonomy logic
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
    const { assets, taxonomy, actions, updateRecord, addRecord } = useRcaContext();
    const [step, setStep] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Initialize with default or existing, BUT we need to validate status immediately
    const [formData, setFormData] = useState<RcaRecord>(() => {
        const base = existingRecord ? { ...createDefaultRecord(), ...existingRecord } : createDefaultRecord();
        return base;
    });

    // --- Initialization & Migration Logic ---
    useEffect(() => {
        setFormData(prev => {
            let updated = { ...prev };

            // 1. Ensure Status is Valid (Fix for "Desynchronized" issue)
            const validStatuses = taxonomy.analysisStatuses.map(s => s.id);
            const defaultStatus = validStatuses.length > 0 ? validStatuses[0] : 'STATUS-01';

            // If current status is empty, DRAFT, or invalid ID -> reset to default
            if (!updated.status || !validStatuses.includes(updated.status)) {
                console.warn(`Invalid status '${updated.status}' detected. Resetting to '${defaultStatus}'`);
                updated.status = defaultStatus;
            }

            // 2. Ensure Analysis Type is valid
            if (!updated.analysis_type && taxonomy.analysisTypes.length > 0) {
                updated.analysis_type = taxonomy.analysisTypes[0].id;
            }

            // 3. Migration: Array-ify Root Causes if missing
            if (!updated.root_causes) {
                updated.root_causes = [];
                // Handle legacy field migration if present in 'any' cast
                const anyRec = updated as any;
                if (anyRec.root_cause && anyRec.root_cause_m_id) {
                    updated.root_causes.push({
                        id: generateId('RC'),
                        cause: anyRec.root_cause,
                        root_cause_m_id: anyRec.root_cause_m_id
                    });
                }
            }

            // 4. Migration: String participants to array
            if (typeof updated.participants === 'string') {
                updated.participants = (updated.participants as string).split(',').map(p => p.trim()).filter(p => p);
            }

            // 5. Ensure structures
            if (!updated.human_reliability) updated.human_reliability = getStandardHraStruct();
            if (!updated.five_whys) updated.five_whys = createDefaultRecord().five_whys;
            if (!updated.ishikawa) updated.ishikawa = emptyIshikawa;

            // 6. Migration: Precision Maintenance (NOT_APPLICABLE -> Empty)
            // Ensures that old records with default 'NOT_APPLICABLE' are treated as unchecked.
            if (!updated.precision_maintenance) {
                updated.precision_maintenance = getStandardPrecisionItems();
            } else {
                updated.precision_maintenance = updated.precision_maintenance.map(item => ({
                    ...item,
                    status: item.status === 'NOT_APPLICABLE' ? '' : item.status
                }));
            }
            return updated;
        });
    }, [existingRecord, taxonomy]); // Run when record loads or taxonomy loads

    // --- Strict Validation & Auto-Promotion Logic ---
    useEffect(() => {
        // 1. Mandatory Fields Check
        const mandatoryStrings = [
            formData.analysis_type,
            formData.what,
            formData.problem_description,
            formData.subgroup_id, // STRICT: User requires subgroup_id for eligibility
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
        const impactsOk = (formData.downtime_minutes !== undefined && formData.downtime_minutes !== null);

        const isMandatoryComplete = stringsOk && participantsOk && rootCausesOk && impactsOk;

        // 2. Action Plan Analysis
        const currentActions = actions.filter(a => a.rca_id === formData.id);
        const hasMainActions = currentActions.length > 0;
        const allActionsEffective = hasMainActions && currentActions.every(a => String(a.status) === '4');

        // 3. Status Decision
        // Get Taxonomy IDs
        const doneItem = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');
        const waitingItem = taxonomy.analysisStatuses.find(s => s.id === 'STATUS-WAITING'); // ID match is safer
        const openItem = taxonomy.analysisStatuses.find(s => s.id === 'STATUS-01');

        const doneStatusId = doneItem?.id || 'STATUS-03';
        const waitingStatusId = waitingItem?.id || 'STATUS-WAITING';
        const openStatusId = openItem?.id || 'STATUS-01';

        // Current status category
        const isClosed = [doneStatusId, 'STATUS-CANCELLED'].includes(formData.status);
        // If already concluded, we generally don't want to revert UNLESS data became invalid?
        // User rule: "se todos os campos... analise concluida".
        // If the user UNCHECKS a mandatory field, it should revert to Open.

        let newStatus = formData.status;

        if (!isMandatoryComplete) {
            // Rule: Not complete -> In Progress (always downgrade if invalid)
            if (newStatus !== openStatusId) newStatus = openStatusId;
        } else {
            // Rule: Complete. Check Actions.
            if (!hasMainActions) {
                // Rule: Complete & No Actions -> Concluded
                if (newStatus !== doneStatusId) newStatus = doneStatusId;
            } else if (allActionsEffective) {
                // Rule: Complete & All Actions Effective -> Concluded
                if (newStatus !== doneStatusId) newStatus = doneStatusId;
            } else {
                // Rule: Complete & Contains Actions with Box != 4 -> Waiting Verification
                if (newStatus !== waitingStatusId) newStatus = waitingStatusId;
            }
        }

        // Only update if changed to avoid infinite loops
        if (newStatus !== formData.status) {
            console.log(`Auto-Updating Status: ${formData.status} -> ${newStatus}`);
            setFormData(prev => ({ ...prev, status: newStatus }));
        }

    }, [
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

    const handleSave = async () => {
        try {
            if (existingRecord) {
                await updateRecord(formData);
            } else {
                await addRecord(formData);
            }
            console.log('✅ RCA salva com sucesso:', formData.id);
            onSaveCallback();
        } catch (error) {
            console.error('❌ Erro ao salvar RCA:', error);
        }
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
