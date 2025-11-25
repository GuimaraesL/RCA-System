
import { AssetNode, RcaRecord, ActionRecord, MigrationData, PrecisionChecklistItem, TaxonomyConfig, TaxonomyItem, HumanReliabilityAnalysis, HraQuestion, HraConclusion } from "../types";

const STORAGE_KEY_ASSETS = 'rca_assets';
const STORAGE_KEY_RECORDS = 'rca_records';
const STORAGE_KEY_ACTIONS = 'rca_actions';
const STORAGE_KEY_TAXONOMY = 'rca_taxonomy';

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
  { id: "1.1", category: "1. Procedimentos e Comunicação", question: "Os procedimentos são precisos e revisados?", question_snapshot: "Os procedimentos são precisos e revisados?", answer: "", comment: "" },
  { id: "1.3", category: "1. Procedimentos e Comunicação", question: "Os procedimentos estão alinhados com as práticas reais?", question_snapshot: "Os procedimentos estão alinhados com as práticas reais?", answer: "", comment: "" },
  { id: "1.4", category: "1. Procedimentos e Comunicação", question: "Há comunicação apropriada de métodos de compartilhamento e escalonamento?", question_snapshot: "Há comunicação apropriada de métodos de compartilhamento e escalonamento?", answer: "", comment: "" },
  { id: "2.1", category: "2. Treinamentos, materiais e sua eficiência", question: "Os materiais de treinamento refletem as informações e conhecimentos necessários?", question_snapshot: "Os materiais de treinamento refletem as informações e conhecimentos necessários?", answer: "", comment: "" },
  { id: "2.2", category: "2. Treinamentos, materiais e sua eficiência", question: "Os conhecimentos e habilidades são adquiridos segundo as rotinas?", question_snapshot: "Os conhecimentos e habilidades são adquiridos segundo as rotinas?", answer: "", comment: "" },
  { id: "3.1", category: "3. Impactos externos (físicos e cognitivos)", question: "Todos os fatores externos como estresse, altos ruídos, calor/frio, vibração, atividades complexas, etc. estão sob controle?", question_snapshot: "Todos os fatores externos como estresse, altos ruídos, calor/frio, vibração, atividades complexas, etc. estão sob controle?", answer: "", comment: "" },
  { id: "4.1", category: "4. Trabalho rotineiro e monótono", question: "Há flexibilidade de treinamentos cruzados disponíveis para os profissionais?", question_snapshot: "Há flexibilidade de treinamentos cruzados disponíveis para os profissionais?", answer: "", comment: "" },
  { id: "4.2", category: "4. Trabalho rotineiro e monótono", question: "Os funcionários compreendem o valor e o impacto de seu trabalho?", question_snapshot: "Os funcionários compreendem o valor e o impacto de seu trabalho?", answer: "", comment: "" },
  { id: "5.1", category: "5. Organização do ambiente e dos processos", question: "As condições de trabalho como: localização e acesso às ferramentas/equipamentos, sequência ideal de tarefas e padrões foram satisfeitas?", question_snapshot: "As condições de trabalho como: localização e acesso às ferramentas/equipamentos, sequência ideal de tarefas e padrões foram satisfeitas?", answer: "", comment: "" },
  { id: "6.1", category: "6. Medidas contra falhas", question: "Existem medidas para ajudar a identificar erros potenciais durante tarefas críticas, atividades ou eventos não rotineiros?", question_snapshot: "Existem medidas para ajudar a identificar erros potenciais durante tarefas críticas, atividades ou eventos não rotineiros?", answer: "", comment: "" },
  { id: "6.2", category: "6. Medidas contra falhas", question: "Os executantes estavam focados na atividade de forma que não ocorresse erro por falta de atenção?", question_snapshot: "Os executantes estavam focados na atividade de forma que não ocorresse erro por falta de atenção?", answer: "", comment: "" }
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
    potential_impacts: 'Downtime. Não houve desvio de qualidade.',
    
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

// --- ACTIONS (New Independent Store) ---
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

// --- IMPORT/EXPORT ---
export const importData = (jsonContent: string): { success: boolean, message: string } => {
  try {
    const data: MigrationData = JSON.parse(jsonContent);
    const records = data.records || (Array.isArray(data) ? data : []);
    const actions = data.actions || [];
    const assets = data.assets || [];
    const taxonomy = data.taxonomy;

    if (!Array.isArray(records)) {
      return { success: false, message: "Invalid JSON: Missing records array." };
    }

    if(assets.length > 0) localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));
    if(records.length > 0) localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    if(actions.length > 0) localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(actions));
    if(taxonomy) localStorage.setItem(STORAGE_KEY_TAXONOMY, JSON.stringify(taxonomy));
    
    return { success: true, message: `Imported successfully. Records: ${records.length}` };
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
    taxonomy: getTaxonomy()
  };
  return JSON.stringify(data, null, 2);
};
