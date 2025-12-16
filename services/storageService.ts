
import { AssetNode, RcaRecord, ActionRecord, TriggerRecord, MigrationData, PrecisionChecklistItem, TaxonomyConfig, TaxonomyItem, HumanReliabilityAnalysis, HraQuestion, HraConclusion } from "../types";

const STORAGE_KEY_ASSETS = 'rca_assets';
const STORAGE_KEY_RECORDS = 'rca_records';
const STORAGE_KEY_ACTIONS = 'rca_actions';
const STORAGE_KEY_TAXONOMY = 'rca_taxonomy';
const STORAGE_KEY_TRIGGERS = 'rca_triggers';

// SECURITY: Sanitize function to strip potential HTML tags from imports
const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return '';
    // Basic stripping of HTML tags to prevent Stored XSS vectors in raw data
    return str.replace(/<[^>]*>?/gm, '');
};

export const generateId = (prefix: string = 'GEN'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

// --- INITIAL DATA ---

const INITIAL_ASSETS: AssetNode[] = [
  {
    id: 'AREA-INIT-01', name: 'Plant A - Manufacturing', type: 'AREA', children: [
      { id: 'EQP-INIT-01', name: 'Rolling Oil System', type: 'EQUIPMENT', children: [
        { id: 'SG-INIT-01', name: 'Auxiliary Equipment', type: 'SUBGROUP', parentId: 'EQP-INIT-01' }
      ], parentId: 'AREA-INIT-01' }
    ]
  },
  {
    id: 'AREA-INIT-02', name: 'Plant B - Packaging', type: 'AREA', children: [
      { id: 'EQP-INIT-02', name: 'Robotic Arm Kuka', type: 'EQUIPMENT', parentId: 'AREA-INIT-02' }
    ]
  }
];

const taxItem = (id: string, name: string): TaxonomyItem => ({ id, name });

const INITIAL_TAXONOMY: TaxonomyConfig = {
  analysisTypes: [
    taxItem('TYPE-01', "Mini RCA"),
    taxItem('TYPE-02', "RCA Completo"),
    taxItem('TYPE-03', "A3 Melhoria")
  ],
  analysisStatuses: [
    taxItem('STATUS-01', "Em Aberto"),
    taxItem('STATUS-02', "Em Andamento"),
    taxItem('STATUS-03', "Aguardando Aprovação"),
    taxItem('STATUS-04', "Cancelada"),
    taxItem('STATUS-DONE', "Concluída")
  ],
  specialties: [
    taxItem('SPEC-01', "Mecânica"),
    taxItem('SPEC-02', "Elétrica"),
    taxItem('SPEC-03', "Instrumentação"),
    taxItem('SPEC-04', "Operação"),
    taxItem('SPEC-05', "Hidráulica"),
    taxItem('SPEC-06', "Automação")
  ],
  failureModes: [
    taxItem('FM-01', "Desacoplado"),
    taxItem('FM-02', "Curto-circuito"),
    taxItem('FM-03', "Desgaste Prematuro"),
    taxItem('FM-04', "Fadiga"),
    taxItem('FM-05', "Sobreaquecimento"),
    taxItem('FM-06', "Vibração Excessiva"),
    taxItem('FM-07', "Vazamento"),
    taxItem('FM-08', "Travamento"),
    taxItem('FM-09', "Ruído Anormal"),
    taxItem('FM-10', "Indicação Falsa")
  ],
  failureCategories: [
    taxItem('FC-01', "Erro de Montagem"),
    taxItem('FC-02', "Fim de Vida Útil"),
    taxItem('FC-03', "Falha Operacional"),
    taxItem('FC-04', "Defeito de Fabricação"),
    taxItem('FC-05', "Falta de Lubrificação"),
    taxItem('FC-06', "Sobrecarga")
  ],
  componentTypes: [
    taxItem('COMP-01', "Rolamento"),
    taxItem('COMP-02', "Motor"),
    taxItem('COMP-03', "Bomba"),
    taxItem('COMP-04', "Válvula"),
    taxItem('COMP-05', "Sensor"),
    taxItem('COMP-06', "Cilindro"),
    taxItem('COMP-07', "Correia"),
    taxItem('COMP-08', "Redutor"),
    taxItem('COMP-09', "Acoplamento"),
    taxItem('COMP-10', "Drive")
  ],
  rootCauseMs: [
    taxItem('M-01', "Meio Ambiente"),
    taxItem('M-02', "Máquina"),
    taxItem('M-03', "Mão de Obra"),
    taxItem('M-04', "Sistema de Medição"),
    taxItem('M-05', "Método"),
    taxItem('M-06', "Material")
  ],
  triggerStatuses: [
    taxItem('TRG-ST-01', "Não iniciada"),
    taxItem('TRG-ST-02', "Em andamento"),
    taxItem('TRG-ST-03', "Concluída"),
    taxItem('TRG-ST-04', "Atrasada"),
    taxItem('TRG-ST-05', "Removido")
  ]
};

const STANDARD_PRECISION_ITEMS: PrecisionChecklistItem[] = [
  { id: "chk_clean", activity: "Área está limpa e arrumada", question_snapshot: "Área está limpa e arrumada", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_tol", activity: "Os ajustes e tolerâncias estão corretos", question_snapshot: "Os ajustes e tolerâncias estão corretos", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_lube", activity: "A lubrificação é limpa, livre de contaminantes, com a quantidade e qualidade adequadas", question_snapshot: "A lubrificação é limpa, livre de contaminantes, com a quantidade e qualidade adequadas", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_belt", activity: "A correia tem tensão e alinhamento corretos", question_snapshot: "A correia tem tensão e alinhamento corretos", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_load", activity: "Cargas estão suportadas corretamente com montagens rígidas e suportes", question_snapshot: "Cargas estão suportadas corretamente com montagens rígidas e suportes", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_align", activity: "Componentes (eixos, motores, redutores, bombas, rolos, ...) estão devidamente alinhados", question_snapshot: "Componentes (eixos, motores, redutores, bombas, rolos, ...) estão devidamente alinhados", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_bal", activity: "Componentes rotativos estão balanceados", question_snapshot: "Componentes rotativos estão balanceados", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_torque", activity: "Torques e Tensões estão corretos, utilizando torquímetros apropriados", question_snapshot: "Torques e Tensões estão corretos, utilizando torquímetros apropriados", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_parts", activity: "Utilizados somente peças de acordo com a especificação para o equipamento (no BOM)", question_snapshot: "Utilizados somente peças de acordo com a especificação para o equipamento (no BOM)", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_func", activity: "Teste Funcional executado", question_snapshot: "Teste Funcional executado", status: "NOT_APPLICABLE", comment: "" },
  { id: "chk_doc", activity: "As modificações foram devidamente documentadas (atualização de desenhos, procedimentos, etc)", question_snapshot: "As modificações foram devidamente documentadas (atualização de desenhos, procedimentos, etc)", status: "NOT_APPLICABLE", comment: "" }
];

export const getStandardPrecisionItems = () => JSON.parse(JSON.stringify(STANDARD_PRECISION_ITEMS));

const STANDARD_HRA_QUESTIONS: HraQuestion[] = [
  { id: "1.1", category: "Procedimentos e Comunicação", question: "Os procedimentos são precisos e revisados?", question_snapshot: "Os procedimentos são precisos e revisados?", answer: "", comment: "" },
  { id: "1.3", category: "Procedimentos e Comunicação", question: "Os procedimentos estão alinhados com as práticas reais?", question_snapshot: "Os procedimentos estão alinhados com as práticas reais?", answer: "", comment: "" },
  { id: "1.4", category: "Procedimentos e Comunicação", question: "Há comunicação apropriada e métodos de compartilhamento e escalonamento?", question_snapshot: "Há comunicação apropriada e métodos de compartilhamento e escalonamento?", answer: "", comment: "" },
  { id: "2.1", category: "Treinamentos, materiais e sua eficiência", question: "Os materiais de treinamento refletem as informações e conhecimentos necessários para as competências identificadas?", question_snapshot: "Os materiais de treinamento refletem as informações e conhecimentos necessários para as competências identificadas?", answer: "", comment: "" },
  { id: "2.2", category: "Treinamentos, materiais e sua eficiência", question: "Os conhecimentos e habilidades estão sendo adquiridos e retidos?", question_snapshot: "Os conhecimentos e habilidades estão sendo adquiridos e retidos?", answer: "", comment: "" },
  { id: "3.1", category: "Impactos externos (físicos e cognitivos)", question: "Há algum fator externo que possa afetar o desempenho do profissional: estresse, altos ruídos, calor/frio, vibração, atividades complexas, etc.?", question_snapshot: "Há algum fator externo que possa afetar o desempenho do profissional: estresse, altos ruídos, calor/frio, vibração, atividades complexas, etc.?", answer: "", comment: "" },
  { id: "4.1", category: "Trabalho rotineiro e monótono", question: "Há flexibilidade e treinamentos cruzados disponíveis para os profissionais?", question_snapshot: "Há flexibilidade e treinamentos cruzados disponíveis para os profissionais?", answer: "", comment: "" },
  { id: "4.2", category: "Trabalho rotineiro e monótono", question: "Os funcionários compreendem o valor e o impacto de seu trabalho?", question_snapshot: "Os funcionários compreendem o valor e o impacto de seu trabalho?", answer: "", comment: "" },
  { id: "5.1", category: "Organização do ambiente e dos processos", question: "As condições de trabalho têm situações que criam dificuldades práticas para os funcionários: localização e acesso as ferramentas/equipamentos, sequência ideal de tarefas e padrões apropriados em vigor?", question_snapshot: "As condições de trabalho têm situações que criam dificuldades práticas para os funcionários: localização e acesso as ferramentas/equipamentos, sequência ideal de tarefas e padrões apropriados em vigor?", answer: "", comment: "" },
  { id: "6.1", category: "Medidas contra falhas", question: "Existem medidas para ajudar a identificar erros potenciais durante tarefas críticas, atividades ou eventos não rotineiros?", question_snapshot: "Existem medidas para ajudar a identificar erros potenciais durante tarefas críticas, atividades ou eventos não rotineiros?", answer: "", comment: "" },
  { id: "6.2", category: "Medidas contra falhas", question: "Há erros que podem ter acontecido por falta de atenção?", question_snapshot: "Há erros que podem ter acontecido por falta de atenção?", answer: "", comment: "" }
];

const STANDARD_HRA_CONCLUSIONS: HraConclusion[] = [
  { id: "procedures", label: "Procedimentos e Comunicação", selected: false, description: "" },
  { id: "training", label: "Treinamentos, materiais e sua eficiência", selected: false, description: "" },
  { id: "external", label: "Impactos externos (físicos e cognitivos)", selected: false, description: "" },
  { id: "routine", label: "Trabalho rotineiro e monótono", selected: false, description: "" },
  { id: "organization", label: "Organização do ambiente e dos processos", selected: false, description: "" },
  { id: "measures", label: "Medidas contra falhas", selected: false, description: "" }
];

export const getStandardHraStruct = (): HumanReliabilityAnalysis => ({
  questions: JSON.parse(JSON.stringify(STANDARD_HRA_QUESTIONS)),
  conclusions: JSON.parse(JSON.stringify(STANDARD_HRA_CONCLUSIONS)),
  validation: { isValidated: "", comment: "" }
});

const INITIAL_RECORDS: RcaRecord[] = [
  {
    id: 'RCA-EXAMPLE-01',
    version: '17.0',
    analysis_date: '2025-08-25',
    analysis_duration_minutes: 45,
    analysis_type: 'TYPE-01',
    status: 'STATUS-DONE',
    participants: ['Ademir', 'Lucas', 'Paulo', 'Lourival'],
    facilitator: 'Felipe Moraes',
    
    start_date: '2025-08-25',
    completion_date: '2025-08-26',
    requires_operation_support: false,

    failure_date: '2025-08-25',
    failure_time: '13:02',
    downtime_minutes: 108,
    financial_impact: 106826.40,
    os_number: 'OS-9982',

    area_id: 'AREA-INIT-01',
    equipment_id: 'EQP-INIT-01',
    subgroup_id: 'SG-INIT-01',
    component_type: 'COMP-10',
    asset_name_display: 'Rolling Oil System',

    specialty_id: 'SPEC-02',
    failure_mode_id: 'FM-10',
    failure_category_id: 'FC-02',

    who: 'Turno',
    what: 'Falha no drive da bomba principal do rolling oil',
    when: 'Durante operação normal',
    where_description: 'Sala de Drives',
    problem_description: 'Parada de 108 minutos no CM3 devido Falha no drive da bomba principal do rolling oil causando normal stop',
    potential_impacts: 'Downtime.',
    quality_impacts: 'Não houve desvio de qualidade.',
    
    five_whys: [
      { id: '1', why_question: 'Laminador parado', answer: 'Falha no sistema rolling oil' },
      { id: '2', why_question: 'Falha no sistema rolling oil', answer: 'Falha no drive da bomba principal' },
      { id: '3', why_question: 'Falha no drive', answer: 'Sinal de alarme de temperatura do drive' },
      { id: '4', why_question: 'Por que alarme?', answer: 'Componente interno danificado' },
      { id: '5', why_question: 'Por que danificou?', answer: 'Fim de vida útil' }
    ],
    
    ishikawa: {
      method: [],
      machine: ['Componente interno danificado', 'Ventilação obstruída'],
      material: ['Fim de vida útil'],
      manpower: [],
      measurement: [],
      environment: []
    },

    root_causes: [
      { id: 'RC-01', root_cause_m_id: 'M-06', cause: 'Fim de vida útil do componente eletrônico do drive.' }
    ],

    precision_maintenance: STANDARD_PRECISION_ITEMS.map(i => i.id === 'chk_clean' ? {...i, status: "EXECUTED"} : i),
    
    human_reliability: getStandardHraStruct(),

    containment_actions: [
      { id: 'ACT-C-01', action: 'Troca do drive reserva', responsible: 'Turno', date: '2025-08-25', status: 'Concluído' }
    ],
    lessons_learned: ['Monitorar temperatura dos drives antigos com maior frequência'],
    general_moc_number: 'MOC-2025-001',

    additionalInfo: {
        meetingNotes: '',
        comments: '',
        historicalInfo: ''
    }
  }
];

const INITIAL_ACTIONS: ActionRecord[] = [
  {
    id: 'ACT-A-01',
    rca_id: 'RCA-EXAMPLE-01',
    action: 'Reparar o drive de acionamento da bomba principal',
    responsible: 'Ademir Alves',
    date: '2025-11-15',
    status: '2', // Em Andamento
    moc_number: ''
  }
];

// --- ASSETS ---
export const getAssets = (): AssetNode[] => {
  const stored = localStorage.getItem(STORAGE_KEY_ASSETS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(INITIAL_ASSETS));
    return INITIAL_ASSETS;
  }
  return JSON.parse(stored);
};

export const saveAssets = (assets: AssetNode[]): void => {
  localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));
};

// --- TAXONOMY ---
export const getTaxonomy = (): TaxonomyConfig => {
  const stored = localStorage.getItem(STORAGE_KEY_TAXONOMY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_TAXONOMY, JSON.stringify(INITIAL_TAXONOMY));
    return INITIAL_TAXONOMY;
  }
  return JSON.parse(stored);
};

export const saveTaxonomy = (taxonomy: TaxonomyConfig): void => {
  localStorage.setItem(STORAGE_KEY_TAXONOMY, JSON.stringify(taxonomy));
};

// --- RECORDS ---
export const getRecords = (): RcaRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY_RECORDS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_RECORDS));
    return INITIAL_RECORDS;
  }
  return JSON.parse(stored);
};

export const saveRecord = (record: RcaRecord): void => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
};

export const saveRecords = (records: RcaRecord[]): void => {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
};

// --- ACTIONS ---
export const getActions = (): ActionRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY_ACTIONS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(INITIAL_ACTIONS));
    return INITIAL_ACTIONS;
  }
  return JSON.parse(stored);
};

export const getActionsByRca = (rcaId: string): ActionRecord[] => {
  const actions = getActions();
  return actions.filter(a => a.rca_id === rcaId);
};

export const saveAction = (action: ActionRecord): void => {
  const actions = getActions();
  const index = actions.findIndex(a => a.id === action.id);
  if (index >= 0) {
    actions[index] = action;
  } else {
    actions.push(action);
  }
  localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(actions));
};

export const saveActions = (actions: ActionRecord[]): void => {
    localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(actions));
};

export const deleteAction = (actionId: string): void => {
  const actions = getActions();
  const newActions = actions.filter(a => a.id !== actionId);
  localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(newActions));
};

// --- TRIGGERS ---
export const getTriggers = (): TriggerRecord[] => {
    const stored = localStorage.getItem(STORAGE_KEY_TRIGGERS);
    return stored ? JSON.parse(stored) : [];
};

export const saveTrigger = (trigger: TriggerRecord): void => {
    const triggers = getTriggers();
    const index = triggers.findIndex(t => t.id === trigger.id);
    if (index >= 0) {
        triggers[index] = trigger;
    } else {
        triggers.push(trigger);
    }
    localStorage.setItem(STORAGE_KEY_TRIGGERS, JSON.stringify(triggers));
};

export const saveTriggers = (triggers: TriggerRecord[]): void => {
    localStorage.setItem(STORAGE_KEY_TRIGGERS, JSON.stringify(triggers));
};

export const deleteTrigger = (id: string): void => {
    const triggers = getTriggers();
    const newTriggers = triggers.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY_TRIGGERS, JSON.stringify(newTriggers));
};

// --- UTILS FOR DYNAMIC FILTERING ---

/**
 * Traverses the asset tree and keeps ONLY the branches that have IDs in the provided set.
 * Returns a pruned tree.
 */
export const filterAssetsByUsage = (allAssets: AssetNode[], usedIds: Set<string>): AssetNode[] => {
    const prune = (nodes: AssetNode[]): AssetNode[] => {
        return nodes.reduce<AssetNode[]>((acc, node) => {
            // Check if this node is used
            const isUsed = usedIds.has(node.id);
            
            // Recurse into children
            const prunedChildren = node.children ? prune(node.children) : [];
            const hasUsedChildren = prunedChildren.length > 0;

            // Keep node if it's used OR has used children
            if (isUsed || hasUsedChildren) {
                acc.push({
                    ...node,
                    children: prunedChildren // Replace children with pruned version
                });
            }
            return acc;
        }, []);
    };

    return prune(allAssets);
};

// --- IMPORT/EXPORT ---
export const importData = (jsonContent: string): { success: boolean, message: string } => {
  try {
    const data: MigrationData = JSON.parse(jsonContent);
    const rawRecords = data.records || (Array.isArray(data) ? data : []);
    const actions = data.actions || [];
    const triggers = data.triggers || [];
    let assets = data.assets || getAssets(); 
    let taxonomy = data.taxonomy || getTaxonomy(); 

    if (!Array.isArray(rawRecords)) {
      return { success: false, message: "Invalid JSON: Missing records array." };
    }

    // --- 1. Auto-Discover Taxonomy Items from Records ---
    const ensureTaxonomy = (listKey: keyof TaxonomyConfig, val: string) => {
        if (!val) return '';
        const list = taxonomy[listKey] || [];
        const existing = list.find(i => i.id === val || i.name.toLowerCase() === val.toLowerCase());
        if (existing) return existing.id;
        
        // Create new
        const newId = val.length < 10 ? val : generateId('AUTO'); 
        list.push({ id: newId, name: sanitizeString(val) }); // Sanitize new taxonomy names
        taxonomy[listKey] = list;
        return newId;
    };

    // --- 2. Auto-Discover Asset Hierarchy from Records ---
    const ensureAsset = (currentNodes: AssetNode[], id: string, type: 'AREA'|'EQUIPMENT'|'SUBGROUP', parentId?: string): AssetNode => {
        let node = currentNodes.find(n => n.id === id);
        if (!node) {
            node = { id, name: sanitizeString(id), type, children: [], parentId };
            currentNodes.push(node);
        }
        return node;
    };

    const recordsToSave = rawRecords.map((rec: any) => {
        // Sanitize Strings in Record
        if (rec.what) rec.what = sanitizeString(rec.what);
        if (rec.problem_description) rec.problem_description = sanitizeString(rec.problem_description);
        if (rec.asset_name_display) rec.asset_name_display = sanitizeString(rec.asset_name_display);
        
        // Normalize Status & Handle DRAFT
        if (rec.status) {
             const statusUpper = rec.status.toString().toUpperCase();
             if (statusUpper === 'DRAFT') {
                 rec.status = 'STATUS-01'; // Map DRAFT to Open
             } else {
                 rec.status = ensureTaxonomy('analysisStatuses', rec.status);
             }
        } else {
            rec.status = 'STATUS-01';
        }

        // Normalize Taxonomy Fields
        if (rec.specialty_id) rec.specialty_id = ensureTaxonomy('specialties', rec.specialty_id);
        if (rec.failure_mode_id) rec.failure_mode_id = ensureTaxonomy('failureModes', rec.failure_mode_id);
        if (rec.failure_category_id) rec.failure_category_id = ensureTaxonomy('failureCategories', rec.failure_category_id);
        if (rec.component_type) rec.component_type = ensureTaxonomy('componentTypes', rec.component_type);
        if (rec.analysis_type) rec.analysis_type = ensureTaxonomy('analysisTypes', rec.analysis_type);

        // Normalize Asset Hierarchy
        if (rec.area_id) {
            const areaNode = ensureAsset(assets, rec.area_id, 'AREA');
            
            if (rec.equipment_id) {
                areaNode.children = areaNode.children || [];
                const equipNode = ensureAsset(areaNode.children, rec.equipment_id, 'EQUIPMENT', rec.area_id);
                
                if (rec.subgroup_id) {
                    equipNode.children = equipNode.children || [];
                    ensureAsset(equipNode.children, rec.subgroup_id, 'SUBGROUP', rec.equipment_id);
                }
            }
        }

        // Normalize Root Cause M
        if (rec.root_causes && Array.isArray(rec.root_causes)) {
            rec.root_causes.forEach((rc: any) => {
                if (rc.root_cause_m_id) {
                    rc.root_cause_m_id = ensureTaxonomy('rootCauseMs', rc.root_cause_m_id);
                }
                if (rc.cause) rc.cause = sanitizeString(rc.cause);
            });
        }

        return rec;
    });

    // Save Everything
    localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));
    localStorage.setItem(STORAGE_KEY_TAXONOMY, JSON.stringify(taxonomy));
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(recordsToSave));
    localStorage.setItem(STORAGE_KEY_TRIGGERS, JSON.stringify(triggers));
    
    if(actions.length > 0) {
        // Sanitize actions
        const sanitizedActions = actions.map((a: any) => ({
            ...a,
            action: sanitizeString(a.action),
            responsible: sanitizeString(a.responsible)
        }));
        localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(sanitizedActions));
    }
    
    return { success: true, message: `Imported successfully. Processed ${rawRecords.length} records and updated configuration.` };
  } catch (e) {
    console.error(e);
    return { success: false, message: "JSON Parse Error" };
  }
};

export const exportData = (): string => {
  const data: MigrationData = {
    metadata: {
        exportDate: new Date().toISOString(),
        systemVersion: '17.0',
        recordCount: getRecords().length,
        description: 'Full System Backup'
    },
    assets: getAssets(),
    records: getRecords(),
    actions: getActions(),
    triggers: getTriggers(),
    taxonomy: getTaxonomy()
  };
  return JSON.stringify(data, null, 2);
};
