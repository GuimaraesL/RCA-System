/**
 * Proposta: Hook principal de orquestração da lógica de negócio do Editor de RCA.
 * Fluxo: Gerencia o estado do formulário (RcaRecord), implementa validações multinível (Criação vs Conclusão), orquestra o salvamento assíncrono e provê suporte a rascunhos técnicos.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { RcaRecord, AssetNode, TaxonomyConfig, ActionRecord } from '../types';
import { generateId, getStandardHraStruct, getStandardPrecisionItems } from '../services/utils';
import { useRcaContext } from '../context/RcaContext';
import { STATUS_IDS } from '../constants/SystemConstants';

export const useRcaLogic = (initialRecord: RcaRecord | null, onSaveSuccess: () => void) => {
    const { assets, taxonomy, addRecord, updateRecord, refreshAll } = useRcaContext();

    const [step, setStep] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

    /**
     * Estado inicial do formulário com preenchimento automático de estruturas padrão.
     */
    const [formData, setFormData] = useState<RcaRecord>(() => {
        if (initialRecord) return { ...initialRecord };

        return {
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
        } as RcaRecord;
    });

    /**
     * Verifica se um campo está tecnicamente vazio, considerando estruturas complexas.
     */
    const isFieldEmpty = useCallback((field: string, value: any): boolean => {
        if (value === undefined || value === null) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) {
            if (field === 'five_whys') return value.filter(w => w.answer.trim()).length < 3;
            if (field === 'root_causes') return value.length === 0;
            return value.length === 0;
        }
        if (typeof value === 'object') {
            if (field === 'ishikawa') {
                return !Object.values(value).some((v: any) => Array.isArray(v) && v.length > 0);
            }
        }
        return false;
    }, []);

    /**
     * Determina se um campo é obrigatório com base na taxonomia e no status atual.
     */
    const isFieldRequired = useCallback((field: string): boolean => {
        const rules = taxonomy?.mandatoryFields;
        if (!rules) return false;

        const isConcluded = formData.status === STATUS_IDS.CONCLUDED;
        const requiredInCreate = rules.rca.create.includes(field);
        const requiredInConclude = rules.rca.conclude.includes(field);

        if (isConcluded) return requiredInCreate || requiredInConclude;
        return requiredInCreate;
    }, [taxonomy, formData.status]);

    /**
     * Valida o formulário completo e retorna os campos com erro.
     */
    const validateForm = useCallback((): Record<string, boolean> => {
        const errors: Record<string, boolean> = {};
        const allFields = [
            'what', 'analysis_type', 'failure_date', 'subgroup_id', 'component_type',
            'who', 'when', 'where_description', 'problem_description', 'specialty_id',
            'failure_mode_id', 'failure_category_id', 'participants', 'root_causes',
            'five_whys', 'ishikawa', 'actions'
        ];

        allFields.forEach(field => {
            if (isFieldRequired(field)) {
                const value = (formData as any)[field];
                if (isFieldEmpty(field, value)) {
                    errors[field] = true;
                }
            }
        });

        setValidationErrors(errors);
        return errors;
    }, [formData, isFieldRequired, isFieldEmpty]);

    /**
     * Persiste os dados no sistema após validação de integridade.
     */
    const handleSave = async () => {
        const errors = validateForm();
        const hasErrors = Object.keys(errors).length > 0;

        if (hasErrors) {
            console.warn('⚠️ Validação: Campos obrigatórios pendentes.', errors);
            // O salvamento é bloqueado apenas se houver violação das regras de 'Criação' 
            // ou se estiver tentando concluir sem os dados necessários.
            return;
        }

        try {
            if (initialRecord) {
                await updateRecord(formData);
            } else {
                await addRecord(formData);
            }
            onSaveSuccess();
        } catch (error) {
            console.error('❌ Erro ao salvar análise:', error);
        }
    };

    const handleAssetSelect = (asset: AssetNode) => {
        setFormData(prev => ({
            ...prev,
            area_id: asset.type === 'AREA' ? asset.id : prev.area_id,
            equipment_id: asset.type === 'EQUIPMENT' ? asset.id : prev.equipment_id,
            subgroup_id: asset.type === 'SUBGROUP' ? asset.id : prev.subgroup_id,
            asset_name_display: asset.name
        }));
    };

    const handleAnalyzeAI = async () => {
        setIsAnalyzing(true);
        // Simulação de delay de processamento de IA
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsAnalyzing(false);
    };

    return {
        step, setStep,
        assets, taxonomy,
        isAnalyzing,
        formData, setFormData,
        handleAssetSelect,
        handleAnalyzeAI,
        handleSave,
        isFieldRequired,
        validationErrors,
        refreshAssets: refreshAll
    };
};
