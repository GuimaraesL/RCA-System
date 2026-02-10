/**
 * Proposta: Serviço de persistência local utilizando LocalStorage.
 * Fluxo: Atua como fonte de dados em modo offline (ou legada), gerenciando o ciclo de vida de RCAs, Ativos, Ações e Gatilhos, além de prover lógica de migração e normalização de dados importados.
 */

import { AssetNode, RcaRecord, ActionRecord, TriggerRecord, MigrationData, PrecisionChecklistItem, TaxonomyConfig, TaxonomyItem, HumanReliabilityAnalysis, HraQuestion, HraConclusion } from "../types";
import { generateId, sanitizeString, getStandardHraStruct, getStandardPrecisionItems } from "./utils";

const STORAGE_KEY_ASSETS = 'rca_assets';
const STORAGE_KEY_RECORDS = 'rca_records';
const STORAGE_KEY_ACTIONS = 'rca_actions';
const STORAGE_KEY_TAXONOMY = 'rca_taxonomy';
const STORAGE_KEY_TRIGGERS = 'rca_triggers';

// --- DADOS INICIAIS (FALLBACK) ---

const INITIAL_ASSETS: AssetNode[] = [
  {
    id: 'AREA-INIT-01', name: 'Planta A - Manufatura', type: 'AREA', children: [
      {
        id: 'EQP-INIT-01', name: 'Sistema de Óleo de Laminação', type: 'EQUIPMENT', children: [
          { id: 'SG-INIT-01', name: 'Equipamentos Auxiliares', type: 'SUBGROUP', parentId: 'EQP-INIT-01' }
        ], parentId: 'AREA-INIT-01'
      }
    ]
  },
  {
    id: 'AREA-INIT-02', name: 'Planta B - Embalagem', type: 'AREA', children: [
      { id: 'EQP-INIT-02', name: 'Braço Robótico Kuka', type: 'EQUIPMENT', parentId: 'AREA-INIT-02' }
    ]
  }
];

const taxItem = (id: string, name: string): TaxonomyItem => ({ id, name });

const INITIAL_TAXONOMY: TaxonomyConfig = {
  analysisTypes: [],
  analysisStatuses: [
    taxItem('STATUS-01', "Em Andamento"),
    taxItem('STATUS-02', "Aguardando Verificação"),
    taxItem('STATUS-03', "Concluída"),
    taxItem('STATUS-04', "Cancelada")
  ],
  specialties: [],
  failureModes: [],
  failureCategories: [],
  componentTypes: [],
  rootCauseMs: [
    taxItem('M1', "Mão de Obra"),
    taxItem('M2', "Método"),
    taxItem('M3', "Material"),
    taxItem('M4', "Máquina"),
    taxItem('M5', "Meio Ambiente"),
    taxItem('M6', "Medida")
  ],
  triggerStatuses: [
    taxItem('T-STATUS-01', "Novo"),
    taxItem('T-STATUS-02', "Em Análise"),
    taxItem('T-STATUS-03', "Convertido em RCA"),
    taxItem('T-STATUS-04', "Arquivado")
  ]
};

const INITIAL_RECORDS: RcaRecord[] = [
  {
    id: 'RCA-EXEMPLO-01',
    version: '17.0',
    analysis_date: '2025-08-25',
    analysis_duration_minutes: 45,
    analysis_type: 'TYPE-01',
    status: 'STATUS-03',
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
    asset_name_display: 'Sistema de Óleo de Laminação',
    specialty_id: 'SPEC-02',
    failure_mode_id: 'FM-10',
    failure_category_id: 'FC-02',
    who: 'Turno',
    what: 'Falha no drive da bomba principal do rolling oil',
    when: 'Durante operação normal',
    where_description: 'Sala de Drives',
    problem_description: 'Parada de 108 minutos no CM3 devido a falha no drive da bomba principal.',
    potential_impacts: 'Indisponibilidade de máquina.',
    quality_impacts: 'Sem desvio de qualidade.',
    five_whys: [
      { id: '1', why_question: 'Laminador parado', answer: 'Falha no sistema rolling oil' },
      { id: '2', why_question: 'Falha no sistema rolling oil', answer: 'Falha no drive da bomba principal' },
      { id: '3', why_question: 'Falha no drive', answer: 'Sinal de alarme de temperatura do drive' },
      { id: '4', why_question: 'Por que alarme?', answer: 'Componente interno danificado' },
      { id: '5', why_question: 'Por que danificou?', answer: 'Fim de vida útil' }
    ],
    ishikawa: {
      method: [], machine: ['Componente interno danificado', 'Ventilação obstruída'],
      material: ['Fim de vida útil'], manpower: [], measurement: [], environment: []
    },
    root_causes: [
      { id: 'RC-01', root_cause_m_id: 'M-06', cause: 'Fim de vida útil do componente eletrônico do drive.' }
    ],
    precision_maintenance: getStandardPrecisionItems().map((i: any) => i.id === 'chk_clean' ? { ...i, status: "EXECUTED" } : i),
    human_reliability: getStandardHraStruct(),
    containment_actions: [
      { id: 'ACT-C-01', action: 'Troca do drive reserva', responsible: 'Turno', date: '2025-08-25', status: 'Concluído' }
    ],
    lessons_learned: ['Monitorar temperatura dos drives antigos com maior frequência'],
    general_moc_number: 'MOC-2025-001',
    additionalInfo: { meetingNotes: '', comments: '', historicalInfo: '' }
  }
];

const INITIAL_ACTIONS: ActionRecord[] = [
  {
    id: 'ACT-A-01',
    rca_id: 'RCA-EXEMPLO-01',
    action: 'Reparar o drive de acionamento da bomba principal',
    responsible: 'Ademir Alves',
    date: '2025-11-15',
    status: '2',
    moc_number: ''
  }
];

// --- GESTÃO DE ATIVOS (ASSETS) ---

export const LEGACY_getAssets = (): AssetNode[] => {
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

// --- TAXONOMIA E CONFIGURAÇÕES ---

export const LEGACY_getTaxonomy = (): TaxonomyConfig => {
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

// --- ANÁLISES (RCAs) ---

export const LEGACY_getRecords = (): RcaRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY_RECORDS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_RECORDS));
    return INITIAL_RECORDS;
  }
  return JSON.parse(stored);
};

export const saveRecord = (record: RcaRecord): void => {
  const records = LEGACY_getRecords();
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

// --- PLANOS DE AÇÃO (CAPA) ---

export const LEGACY_getActions = (): ActionRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY_ACTIONS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(INITIAL_ACTIONS));
    return INITIAL_ACTIONS;
  }
  return JSON.parse(stored);
};

export const getActionsByRca = (rcaId: string): ActionRecord[] => {
  const actions = LEGACY_getActions();
  return actions.filter(a => a.rca_id === rcaId);
};

export const saveAction = (action: ActionRecord): void => {
  const actions = LEGACY_getActions();
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
  const actions = LEGACY_getActions();
  const newActions = actions.filter(a => a.id !== actionId);
  localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(newActions));
};

// --- GATILHOS (TRIGGERS) ---

export const LEGACY_getTriggers = (): TriggerRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TRIGGERS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const saveTrigger = (trigger: TriggerRecord): void => {
  const triggers = LEGACY_getTriggers();
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
  const triggers = LEGACY_getTriggers();
  const newTriggers = triggers.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TRIGGERS, JSON.stringify(newTriggers));
};

// --- IMPORTAÇÃO E EXPORTAÇÃO ---

/**
 * Processa a importação de um backup integral via JSON.
 * Realiza auto-descoberta de itens de taxonomia e reconstrói a hierarquia de ativos a partir dos registros.
 */
export const importData = (jsonContent: string): { success: boolean, message: string } => {
  try {
    const data: MigrationData = JSON.parse(jsonContent);
    const rawRecords = data.records || (Array.isArray(data) ? data : []);
    const actions = data.actions || [];
    const triggers = data.triggers || [];
    let assets = data.assets || LEGACY_getAssets();
    let taxonomy = data.taxonomy || LEGACY_getTaxonomy();

    if (!Array.isArray(rawRecords)) {
      return { success: false, message: "JSON inválido: Array de registros não encontrado." };
    }

    // 1. Auto-descoberta de itens de taxonomia a partir dos registros importados
    const ensureTaxonomy = (listKey: keyof TaxonomyConfig, val: string) => {
      if (!val) return '';
      const list = (taxonomy[listKey] as TaxonomyItem[]) || [];
      const existing = list.find(i => i.id === val || i.name.toLowerCase() === val.toLowerCase());
      if (existing) return existing.id;

      const newId = val.length < 10 ? val : generateId('AUTO');
      list.push({ id: newId, name: sanitizeString(val) }); 
      // @ts-ignore
      taxonomy[listKey] = list;
      return newId;
    };

    // 2. Reconstrução da hierarquia de ativos baseada na localização técnica dos registros
    const ensureAsset = (currentNodes: AssetNode[], id: string, type: 'AREA' | 'EQUIPMENT' | 'SUBGROUP', parentId?: string): AssetNode => {
      let node = currentNodes.find(n => n.id === id);
      if (!node) {
        node = { id, name: sanitizeString(id), type, children: [], parentId };
        currentNodes.push(node);
      }
      return node;
    };

    const recordsToSave = rawRecords.map((rec: any) => {
      if (rec.what) rec.what = sanitizeString(rec.what);
      if (rec.problem_description) rec.problem_description = sanitizeString(rec.problem_description);
      if (rec.asset_name_display) rec.asset_name_display = sanitizeString(rec.asset_name_display);

      // Normalização de Status e mapeamento de rascunhos (DRAFT)
      if (rec.status) {
        const statusUpper = rec.status.toString().toUpperCase();
        if (statusUpper === 'DRAFT') {
          rec.status = 'STATUS-01'; 
        } else {
          rec.status = ensureTaxonomy('analysisStatuses', rec.status);
        }
      } else {
        rec.status = 'STATUS-01';
      }

      if (rec.specialty_id) rec.specialty_id = ensureTaxonomy('specialties', rec.specialty_id);
      if (rec.failure_mode_id) rec.failure_mode_id = ensureTaxonomy('failureModes', rec.failure_mode_id);
      if (rec.failure_category_id) rec.failure_category_id = ensureTaxonomy('failureCategories', rec.failure_category_id);
      if (rec.component_type) rec.component_type = ensureTaxonomy('componentTypes', rec.component_type);
      if (rec.analysis_type) rec.analysis_type = ensureTaxonomy('analysisTypes', rec.analysis_type);

      // Reconstrução da árvore de ativos via registros
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

    // Persistência Integral no LocalStorage
    localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));
    localStorage.setItem(STORAGE_KEY_TAXONOMY, JSON.stringify(taxonomy));
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(recordsToSave));
    localStorage.setItem(STORAGE_KEY_TRIGGERS, JSON.stringify(triggers));

    if (actions.length > 0) {
      const sanitizedActions = actions.map((a: any) => ({
        ...a,
        action: sanitizeString(a.action),
        responsible: sanitizeString(a.responsible)
      }));
      localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(sanitizedActions));
    }

    return { success: true, message: `Importação concluída com sucesso. ${rawRecords.length} registros processados.` };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Erro crítico no processamento do JSON." };
  }
};

/**
 * Gera um objeto integral contendo todo o estado do sistema para backup.
 */
export const exportData = (): string => {
  const data: MigrationData = {
    metadata: {
      exportDate: new Date().toISOString(),
      systemVersion: '17.0',
      recordCount: LEGACY_getRecords().length,
      description: 'Backup Integral do Sistema'
    },
    assets: LEGACY_getAssets(),
    records: LEGACY_getRecords(),
    actions: LEGACY_getActions(),
    triggers: LEGACY_getTriggers(),
    taxonomy: LEGACY_getTaxonomy()
  };
  return JSON.stringify(data, null, 2);
};