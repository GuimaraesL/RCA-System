/**
 * Proposta: Hook de gerenciamento de estado e lógica do formulário RCA.
 * Fluxo: Encapsula o estado da RCA, lógica de passos, validação e integração com ações.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { RcaRecord, AssetNode, ActionRecord } from '../types';
import { generateId, getStandardHraStruct, getStandardPrecisionItems } from '../services/utils';
import { useRcaContext } from '../context/RcaContext';
import { STATUS_IDS, ROOT_CAUSE_M_IDS } from '../constants/SystemConstants';
import { updateDeep } from '../utils/objectUtils';
import { useToast } from '../context/ToastContext';
import { isComponentVisible, isStepVisible } from '@/services/TemplateService';
import { getWizardSteps } from '@/constants/WizardSteps';

export const useRcaForm = (initialRecord: RcaRecord | null, onSaveSuccess: () => void) => {
    const { assets, taxonomy, actions, addRecord, updateRecord, addAction, updateAction, deleteAction, refreshAll } = useRcaContext();

    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
    const [linkedActions, setLinkedActions] = useState<ActionRecord[]>([]);

    /**
     * Estado inicial do formulário.
     */
    const [formData, setFormData] = useState<RcaRecord>(() => {
        const defaultRca: RcaRecord = {
            id: generateId('RCA'),
            version: '17.2',
            analysis_date: new Date().toISOString().split('T')[0],
            analysis_duration_minutes: 0,
            analysis_type: '',
            status: STATUS_IDS.IN_PROGRESS,
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
            five_whys: [],
            ishikawa: { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] },
            root_causes: [],
            precision_maintenance: getStandardPrecisionItems(),
            human_reliability: getStandardHraStruct(),
            containment_actions: [],
            lessons_learned: []
        };

        if (initialRecord) {
            const merged = { ...defaultRca, ...initialRecord };

            // Garantir integridade de estruturas críticas
            if (!merged.precision_maintenance || merged.precision_maintenance.length === 0) {
                merged.precision_maintenance = defaultRca.precision_maintenance;
            }
            if (!merged.human_reliability || !merged.human_reliability.questions || merged.human_reliability.questions.length === 0) {
                merged.human_reliability = defaultRca.human_reliability;
            }
            if (!merged.ishikawa) merged.ishikawa = defaultRca.ishikawa;
            if (!merged.five_whys) merged.five_whys = defaultRca.five_whys;
            if (!merged.root_causes) merged.root_causes = defaultRca.root_causes;

            return merged;
        }
        return defaultRca;
    });

    /**
     * Lógica condicional para exibição do HRA.
     * Definida ANTES dos Effects que a utilizam.
     */
    const showHra = useMemo(() => {
        // First check if HRA is allowed by the template
        const isAllowedByTemplate = isComponentVisible(formData.analysis_type, 'HRA');
        if (!isAllowedByTemplate) return false;

        // If allowed, check if it's triggered by Manpower/Method root causes
        return (formData.root_causes || []).some(rc =>
            (rc.root_cause_m_id === ROOT_CAUSE_M_IDS.MANPOWER || rc.root_cause_m_id === ROOT_CAUSE_M_IDS.METHOD) && !!rc.root_cause_m_id
        );
    }, [formData.root_causes, formData.analysis_type]);

    // Sincroniza ações vinculadas
    useEffect(() => {
        if (formData.id) {
            setLinkedActions(actions.filter(a => a.rca_id === formData.id));
        }
    }, [formData.id, actions]);

    /**
     * Atualizador genérico de campos.
     */
    const handleChange = useCallback((field: string, value: any) => {
        setFormData(prev => {
            if (!field.includes('.')) {
                return { ...prev, [field]: value };
            }
            const parts = field.split('.');
            return updateDeep(prev, parts, value);
        });
    }, []);

    const handleAssetSelect = useCallback((asset: AssetNode) => {
        setFormData(prev => ({
            ...prev,
            area_id: asset.type === 'AREA' ? asset.id : prev.area_id,
            equipment_id: asset.type === 'EQUIPMENT' ? asset.id : prev.equipment_id,
            subgroup_id: asset.type === 'SUBGROUP' ? asset.id : prev.subgroup_id,
            asset_name_display: asset.name
        }));
    }, []);

    const isFieldEmpty = useCallback((field: string, value: any): boolean => {
        if (value === undefined || value === null) return true;

        if (typeof value === 'string') return value.trim() === '';

        if (typeof value === 'number') return false; // 0 é valor válido. Null/Undefined pego acima.

        if (Array.isArray(value)) {
            if (value.length === 0) return true; // Array vazio é inválido se obrigatório

            if (field === 'five_whys') return 3 > value.filter(w => w.answer && w.answer.trim()).length; // Regra de negócio específica dos 5 Porquês
            if (field === 'root_causes') return value.length === 0; // Basta ter uma causa
            if (field === 'lessons_learned') return value.every(l => typeof l === 'string' && l.trim() === ''); // Array de strings vazio ou só strings vazias

            // Validação de Checklist de Precisão
            if (field === 'precision_maintenance') {
                // Se obrigatório, exige que TODOS os itens tenham status definido (EXECUTED, NOT_EXECUTED, NOT_APPLICABLE)
                // Ou pelo menos que não esteja "em branco". Vamos exigir 100% de preenchimento se for obrigatório.
                return value.some(item => !item.status);
            }

            return false;
        }

        if (typeof value === 'object') {
            if (field === 'ishikawa') {
                // Ishikawa vazio = nenhum item em nenhuma categoria
                return !Object.values(value).some((v: any) => Array.isArray(v) && v.length > 0);
            }
            // Objeto genérico vazio
            return Object.keys(value).length === 0;
        }

        return false;
    }, []);

    const isFieldRequired = useCallback((field: string): boolean => {
        const rules = taxonomy?.mandatoryFields;
        if (!rules) return false;
        const isConcluded = formData.status === STATUS_IDS.CONCLUDED;
        return isConcluded ? (rules.rca.create.includes(field) || rules.rca.conclude.includes(field)) : rules.rca.create.includes(field);
    }, [taxonomy, formData.status]);

    const validateForm = useCallback((t: (k: string) => string = (k) => k): Record<string, boolean> => {
        const errors: Record<string, boolean> = {};

        // Determina quais regras aplicar baseado no status atual (Conclusão vs Salvamento/Criação)
        const rules = taxonomy?.mandatoryFields;
        if (!rules) return {};

        const isConcluded = formData.status === STATUS_IDS.CONCLUDED;

        // Se estiver concluindo, aplica ambas as listas (Create + Conclude)
        let fieldsToValidate = isConcluded
            ? [...new Set([...rules.rca.create, ...rules.rca.conclude])]
            : rules.rca.create;

        // NOVIDADE: Filtrar apenas campos que pertencem a passos VISÍVEIS para o template
        const visibleSteps = getWizardSteps(t, formData.analysis_type, showHra);
        const visibleFields = new Set(visibleSteps.flatMap(s => s.fields));
        
        // HRA is special (step 9), check its visibility separately
        if (isStepVisible(formData.analysis_type, 9) && showHra) {
            // If HRA is visible, its fields should be validated if they were mandatory
            // (HRA fields aren't usually in the mandatory list yet, but we'll be future-proof)
        }

        fieldsToValidate = fieldsToValidate.filter(field => visibleFields.has(field) || field === 'analysis_type');

        fieldsToValidate.forEach(field => {
            if (isFieldEmpty(field, (formData as any)[field])) {
                errors[field] = true;
            }
        });

        setValidationErrors(errors);
        return errors;
    }, [formData, taxonomy, isFieldEmpty, showHra]);

    const toast = useToast();

    const handleSave = async (t: (k: string) => string = (k) => k) => {
        console.log('HOOK: handleSave called');
        const errors = validateForm(t);
        if (Object.keys(errors).length > 0) {
            console.log('HOOK: Validation errors:', JSON.stringify(errors));
            toast.error('Preencha os campos obrigatórios antes de salvar.');
            return;
        }

        setIsSaving(true);
        try {
            console.log('HOOK: Calling updateRecord/addRecord');
            if (initialRecord) await updateRecord(formData);
            else await addRecord(formData);
            toast.success('Análise RCA salva com sucesso!');
            console.log('HOOK: Save success');
            onSaveSuccess();
        } catch (error) {
            console.error('HOOK: Error saving RCA:', error);
            toast.error('Erro ao salvar RCA. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAction = async (action: ActionRecord) => {
        if (!action.id) action.id = generateId('ACT');
        action.rca_id = formData.id;
        try {
            if (actions.find(a => a.id === action.id)) await updateAction(action);
            else await addAction(action);
            toast.success('Ação salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar ação:', error);
            toast.error('Erro ao salvar ação.');
        }
    };


    const hasStepError = useCallback((stepFields: string[]) => {
        return stepFields.some(field => validationErrors[field]);
    }, [validationErrors]);

    return {
        formData, setFormData,
        step, setStep,
        isSaving,
        validationErrors,
        linkedActions,
        handleChange,
        handleAssetSelect,
        handleSave,
        handleSaveAction,
        handleDeleteAction: deleteAction,
        isFieldRequired,
        showHra,
        hasStepError,
        assets,
        taxonomy,
        refreshAssets: refreshAll
    };
};
