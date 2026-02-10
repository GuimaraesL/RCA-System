/**
 * Proposta: Hook de orquestração da lógica de negócio e estado do Editor de RCA.
 * Fluxo: Gerencia o estado do formulário, navegação entre passos, validação multinível e integração com a API via contexto.
 */

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
    status: '', // Definido dinamicamente pela taxonomia
    participants: [],
    facilitator: '',

    start_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    requires_operation_support: false,

    failure_date: '', 
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
    const isAnalyzing = false; // Funcionalidade de IA desativada nesta versão

    // Inicializa o formulário com dados existentes ou valores padrão
    const [formData, setFormData] = useState<RcaRecord>(() => {
        const base = createDefaultRecord();
        if (existingRecord) {
            const s = (val: any, def: any) => (val === null || val === undefined ? def : val);

            return {
                ...base,
                ...existingRecord,
                // Saneamento de campos críticos para evitar erros de renderização
                financial_impact: s(existingRecord.financial_impact, 0),
                downtime_minutes: s(existingRecord.downtime_minutes, 0),
                status: s(existingRecord.status, base.status),

                // Mesclagem de estruturas profundas obrigatórias
                human_reliability: existingRecord.human_reliability || base.human_reliability,
                precision_maintenance: existingRecord.precision_maintenance || base.precision_maintenance,
                five_whys: existingRecord.five_whys || base.five_whys,
                root_causes: existingRecord.root_causes || []
            };
        }
        return base;
    });

    // Orquestração de Inicialização e Normalização de dados legados
    useEffect(() => {
        setFormData(prev => {
            let updated = { ...prev };

            // 1. Validação de Status via Taxonomia
            const validStatuses = taxonomy.analysisStatuses.map(s => s.id);
            const defaultStatus = validStatuses.length > 0 ? validStatuses[0] : 'STATUS-01';

            if (!updated.status || !validStatuses.includes(updated.status)) {
                console.warn(`Status inválido '${updated.status}' detectado. Resetando para '${defaultStatus}'`);
                updated.status = defaultStatus;
            }

            // 2. Garantia de Estruturas de Investigação
            if (!updated.human_reliability) updated.human_reliability = getStandardHraStruct();

            // 3. Migração de Causas Raiz (formato legado para array)
            if (!updated.root_causes) {
                updated.root_causes = [];
                const anyRec = updated as any;
                if (anyRec.root_cause && anyRec.root_cause_m_id) {
                    updated.root_causes.push({
                        id: generateId('RC'),
                        cause: anyRec.root_cause,
                        root_cause_m_id: anyRec.root_cause_m_id
                    });
                }
            }

            // 4. Normalização de Participantes
            if (typeof updated.participants === 'string') {
                updated.participants = (updated.participants as string).split(',').map(p => p.trim()).filter(p => p);
            }

            // 5. Estruturas mínimas para UI
            if (!updated.five_whys) updated.five_whys = createDefaultRecord().five_whys;
            if (!updated.five_whys_chains) updated.five_whys_chains = [];
            if (!updated.ishikawa) updated.ishikawa = emptyIshikawa;

            // 6. Limpeza de estados legados de Manutenção de Precisão
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
    }, [existingRecord, taxonomy]);

    const refreshAssets = () => {
        // Sincronização de ativos gerenciada via contexto
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
        console.warn('Funcionalidade de análise por IA desabilitada nesta versão.');
    };

    const isFieldRequired = (fieldName: string) => {
        const createFields = taxonomy.mandatoryFields?.rca?.create || [];
        const concludeFields = taxonomy.mandatoryFields?.rca?.conclude || [];
        return createFields.includes(fieldName) || concludeFields.includes(fieldName);
    };

    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

    const isFieldEmpty = (field: string): boolean => {
        // Validação especial para Planos de Ação (CAPA)
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
            // Contabiliza respostas tanto do modo linear quanto do modo avançado (cadeias)
            const linearCount = Array.isArray(formData.five_whys) ? formData.five_whys.filter((w: any) => w.answer?.trim()).length : 0;
            
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
            
            return (linearCount + advancedCount) < 3; // Mínimo de 3 porquês preenchidos para validação de conclusão
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

        const createFields = taxonomy.mandatoryFields?.rca?.create || [];
        const concludeFields = taxonomy.mandatoryFields?.rca?.conclude || [];

        // Marca TODOS os campos obrigatórios para feedback visual imediato (Reforço Vermelho)
        const allMandatory = Array.from(new Set([...createFields, ...concludeFields]));
        
        allMandatory.forEach(field => {
            if (isFieldEmpty(field)) errors[field] = true;
        });

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        validateForm(); 

        const createFields = taxonomy.mandatoryFields?.rca?.create || [];
        const concludeFields = taxonomy.mandatoryFields?.rca?.conclude || [];
        const isTryingToConclude = formData.status === 'STATUS-03';

        let currentBlockingFields: string[] = [];
        
        // Bloqueio Hard: Campos de criação sempre impedem o salvamento se vazios
        createFields.forEach(field => {
            if (isFieldEmpty(field)) currentBlockingFields.push(field);
        });

        // Bloqueio Seletivo: Campos de conclusão impedem salvamento apenas se o status for "Concluída"
        if (isTryingToConclude) {
            concludeFields.forEach(field => {
                if (isFieldEmpty(field)) currentBlockingFields.push(field);
            });
        }

        if (currentBlockingFields.length > 0) {
            console.warn('❌ Salvamento bloqueado: dados obrigatórios ausentes.', {
                motivo: isTryingToConclude ? 'Campos de conclusão faltando' : 'Campos mínimos de criação faltando',
                campos: currentBlockingFields
            });
            return false;
        }
        
        try {
            if (existingRecord) {
                await updateRecord(formData);
            } else {
                await addRecord(formData);
            }
            console.log('✅ Context: RCA salva com sucesso');
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
        validationErrors
    };
};