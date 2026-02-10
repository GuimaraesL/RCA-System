
import { useState, useEffect } from 'react';
import { RcaRecord, AssetNode, IshikawaDiagram } from '../types';
import { getStandardPrecisionItems, getStandardHraStruct, generateId } from '../services/utils';
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

    failure_date: '', // FORCE USER SELECTION (Before: new Date())
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
    five_whys_chains: [],
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
    // AI analysis feature removed - isAnalyzing kept for API compatibility
    const isAnalyzing = false;

    // Initialize with default or existing, BUT we need to validate status immediately
    const [formData, setFormData] = useState<RcaRecord>(() => {
        const base = createDefaultRecord();
        if (existingRecord) {
            // Helper to safe-guard against SQL nulls
            const s = (val: any, def: any) => (val === null || val === undefined ? def : val);

            return {
                ...base,
                ...existingRecord,
                // Sanitize critical fields that might cause RcaEditor inputs to crash if null
                financial_impact: s(existingRecord.financial_impact, 0),
                downtime_minutes: s(existingRecord.downtime_minutes, 0),
                status: s(existingRecord.status, base.status),

                // Deep merge essential structures
                human_reliability: existingRecord.human_reliability || base.human_reliability,
                precision_maintenance: existingRecord.precision_maintenance || base.precision_maintenance,
                five_whys: existingRecord.five_whys || base.five_whys,
                root_causes: existingRecord.root_causes || []
            };
        }
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

            // 2. Ensure Structures (Optimisation)
            if (!updated.human_reliability) updated.human_reliability = getStandardHraStruct();

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
            if (!updated.five_whys_chains) updated.five_whys_chains = [];
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

    // --- Lógica de Validação Estrita & Auto-Promoção de Status ---
    // Esta lógica garante que o status da análise reflita a qualidade dos dados em tempo real.
    // 
    // REGRAS DE NEGÓCIO:
    // 1. Escopo de Atuação:
    //    - Apenas status "Gerenciados" são alterados automaticamente: 
    //      [Em Andamento, Aguardando Verificação, Concluída, Vazio].
    //    - Status manuais (ex: Cancelada) são PROTEGIDOS e ignorados.
    //
    // 2. Pré-requisitos (Mandatory):
    //    - Todos os campos de texto, IDs de Taxonomia, Listas (Participantes/Causas).
    //    - **Crítico:** `subgroup_id` é obrigatório.
    //    - Se falhar: Rebaixa para 'STATUS-01' (Em Andamento).
    //
    // 3. Critérios de Promoção (Se Pré-requisitos OK):
    //    - Sem Ações? -> Considera 'Concluída' (STATUS-03).
    //    - Com Ações? -> Verifica eficácia (Box 3 ou 4).
    //      - TUDO Box 3/4? -> 'Concluída' (STATUS-03).
    //      - Alguma Pendente? -> 'Aguardando Verificação' (STATUS-WAITING).
    // 
    // ⚠️ ISSUE #20 - MIGRAÇÃO DE LÓGICA PARA BACKEND
    // ==============================================================================
    // Esta lógica de auto-promoção de status foi REMOVIDA do frontend.
    // O backend (rcaStatusService.ts) agora é a ÚNICA fonte da verdade.
    // 
    // Motivo: O useEffect tinha um bug - não incluía 'subgroup_id' nas dependências,
    // causando status incorretos para análises com campos obrigatórios faltando.
    // 
    // Comportamento atual:
    // 1. POST/PUT /api/rcas calcula o status automaticamente via rcaStatusService
    // 2. POST/PUT/DELETE /api/actions recalcula o status da RCA associada
    // 3. O frontend recebe o status correto na resposta da API
    // 
    // Para forçar recálculo de um registro antigo: abrir e salvar a análise.
    // ==============================================================================

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

    // AI analysis feature removed - function kept as no-op for API compatibility
    const handleAnalyzeAI = async () => {
        console.warn('AI analysis feature has been disabled');
    };

    // Helper to check if a field is required (either for Create or Conclude)
    const isFieldRequired = (fieldName: string) => {
        const createFields = taxonomy.mandatoryFields?.rca?.create || [];
        const concludeFields = taxonomy.mandatoryFields?.rca?.conclude || [];
        return createFields.includes(fieldName) || concludeFields.includes(fieldName);
    };

    // Validation State
    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

    // Lista mínima de campos para SALVAR o registro (Permite Draft)
    // Para considerá-la "Concluída", a lógica do useEffect acima (auto-status) continua verificando a lista completa.
    const isFieldEmpty = (field: string): boolean => {
        // Special check for 'actions' since it's not in formData
        if (field === 'actions') {
            const rcaActions = actions.filter(a => 
                a.rca_id?.trim().toLowerCase() === formData.id?.trim().toLowerCase()
            );
            return rcaActions.length === 0;
        }

        const val = (formData as any)[field];
        if (field === 'participants') {
            return !Array.isArray(val) || val.length === 0 || (val.length === 1 && val[0] === '');
        }
        if (field === 'root_causes') {
            return !Array.isArray(val) || val.length === 0 || val.some(rc => !rc.root_cause_m_id || !rc.cause.trim());
        }
        if (field === 'five_whys') {
            // Count answers in Linear Mode
            const linearCount = Array.isArray(formData.five_whys) ? formData.five_whys.filter((w: any) => w.answer?.trim()).length : 0;
            
            // Count answers in Advanced Mode (Chains)
            let advancedCount = 0;
            if (Array.isArray(formData.five_whys_chains)) {
                const countNodeAnswers = (node: any): number => {
                    let count = Array.isArray(node.whys) ? node.whys.filter((w: any) => w.answer?.trim()).length : 0;
                    if (Array.isArray(node.children)) {
                        node.children.forEach((child: any) => { count += countNodeAnswers(child); });
                    }
                    return count;
                };
                formData.five_whys_chains.forEach(chain => {
                    if (chain.root_node) advancedCount += countNodeAnswers(chain.root_node);
                });
            }
            
            return (linearCount + advancedCount) < 3; // Minimum 3 whys required if mandatory
        }
        if (field === 'ishikawa') {
            return !val || Object.values(val).every((arr: any) => Array.isArray(arr) && arr.length === 0);
        }
        if (['downtime_minutes', 'financial_impact'].includes(field)) {
            return val === undefined || val === null;
        }
        return !val || (typeof val === 'string' && val.trim() === '');
    };

    const validateForm = (): boolean => {
        const errors: Record<string, boolean> = {};

        // Dynamic from Settings - Only Source of Truth
        const createFields = taxonomy.mandatoryFields?.rca?.create || [];
        const concludeFields = taxonomy.mandatoryFields?.rca?.conclude || [];

        // Flag ALL mandatory fields for visual reinforcement
        const allMandatory = Array.from(new Set([...createFields, ...concludeFields]));
        
        allMandatory.forEach(field => {
            if (isFieldEmpty(field)) errors[field] = true;
        });

        setValidationErrors(errors);
        
        // Logical result: would this pass a STRICT validation?
        // (Not used for blocking anymore, handleSave handles that)
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        // 1. Refresh visual errors for ALL mandatory fields
        validateForm(); 

        const createFields = taxonomy.mandatoryFields?.rca?.create || [];
        const concludeFields = taxonomy.mandatoryFields?.rca?.conclude || [];
        const isTryingToConclude = formData.status === 'STATUS-03';

        // 2. Determine blocking fields
        let currentBlockingFields: string[] = [];
        
        // Critical: Creation fields always block
        createFields.forEach(field => {
            if (isFieldEmpty(field)) currentBlockingFields.push(field);
        });

        // Strict: Conclusion fields only block if saving as Concluded
        if (isTryingToConclude) {
            concludeFields.forEach(field => {
                if (isFieldEmpty(field)) currentBlockingFields.push(field);
            });
        }

        // 3. Prevent save only if current rules are violated
        if (currentBlockingFields.length > 0) {
            console.warn('❌ Save Blocked:', {
                reason: isTryingToConclude ? 'Missing conclusion data' : 'Missing minimum creation data',
                fields: currentBlockingFields
            });
            return false;
        }
        
        try {
            if (existingRecord) {
                await updateRecord(formData);
            } else {
                await addRecord(formData);
            }
            console.log('✅ RCA salva com sucesso:', formData.id);
            onSaveCallback();
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar RCA:', error);
            return false;
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
        handleSave,
        isFieldRequired,
        validationErrors // Exposed
    };
};
