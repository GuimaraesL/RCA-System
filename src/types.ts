/**
 * Proposta: Definições globais de tipos e interfaces do frontend.
 * Fluxo: Centraliza os contratos de dados para RCAs, Ativos, Gatilhos, Ações e Taxonomia, incluindo ViewModels otimizados para a interface e estruturas de migração.
 */

export type AnalysisType = "Mini RCA" | "RCA Completo" | "A3 Melhoria";

export enum Criticality {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AssetNode {
  id: string;
  name: string;
  type: 'AREA' | 'EQUIPMENT' | 'SUBGROUP';
  children?: AssetNode[];
  parentId?: string;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  specialty_ids?: string[]; // IDs das especialidades vinculadas a este item
}

export interface TaxonomyConfig {
  analysisTypes: TaxonomyItem[];
  analysisStatuses: TaxonomyItem[];
  specialties: TaxonomyItem[];
  failureModes: TaxonomyItem[];
  failureCategories: TaxonomyItem[];
  componentTypes: TaxonomyItem[];
  rootCauseMs: TaxonomyItem[];
  triggerStatuses: TaxonomyItem[];
  mandatoryFields?: MandatoryFieldsConfig;
}

export interface MandatoryFieldsConfig {
  trigger: {
    save: string[];
  };
  rca: {
    create: string[];
    conclude: string[];
  };
}

// --- Tipos de Investigação ---

export interface FiveWhy {
  id: string;
  why_question: string;
  answer: string;
}

/**
 * Estrutura Hierárquica dos 5 Porquês (Modo Avançado).
 */
export interface FiveWhyNode {
  id: string;
  level: number;  // 0=Causa, 1-5=Porquês
  row?: number;
  cause_effect?: string;
  whys: { level: number; answer: string }[];
  children: FiveWhyNode[];
}

export interface FiveWhyChain {
  chain_id: string;
  cause_effect: string;
  root_node: FiveWhyNode;
}

export interface IshikawaDiagram {
  method: string[];
  machine: string[];
  material: string[];
  manpower: string[];
  measurement: string[];
  environment: string[];
}

// --- Tipos de Manutenção de Precisão ---

export type PrecisionStatus = "EXECUTED" | "NOT_EXECUTED" | "NOT_APPLICABLE" | "";

export interface PrecisionChecklistItem {
  id: string; // ID Semântico ou UUID
  activity: string; // Definição de texto atual (i18n)
  question_snapshot?: string; // Texto histórico no momento do registro
  status: PrecisionStatus;
  comment?: string;
}

// --- Tipos de Planos e Lições ---

export interface ContainmentAction {
  id: string;
  action: string;
  responsible: string;
  date: string; // YYYY-MM-DD
  status: string;
}

/**
 * Status baseado na lógica de 'Box' (Matriz de Prioridade/Aprovação).
 */
export type ActionStatus = '1' | '2' | '3' | '4';

export interface ActionRecord {
  id: string;
  rca_id: string;
  action: string;
  responsible: string;
  date: string;
  status: ActionStatus;
  moc_number?: string;
}

/**
 * ViewModel enriquecido para visualização de ações na interface.
 */
export interface ActionViewModel extends ActionRecord {
  rcaTitle: string;
  assetName: string;
  areaId: string;
  equipmentId: string;
  subgroupId: string;
  categoryId: string;
  specialtyId: string;
  // Campos pré-computados para otimização de busca e filtragem
  searchContext: string; // Texto de busca normalizado
  yearStr: string;       // ex: "2024"
  monthStr: string;      // ex: "01"
}

// --- Tipos de Gatilhos (Triggers) ---

export interface TriggerRecord {
  id: string;
  // Vínculos com a hierarquia de ativos
  area_id: string;
  equipment_id: string;
  subgroup_id: string;

  start_date: string; // ISO Date Time
  end_date: string;   // ISO Date Time
  duration_minutes: number;

  stop_type: string;
  stop_reason: string;
  comments: string;

  analysis_type_id: string; // Vínculo com Taxonomia
  status: string; // ID dinâmico da Taxonomia
  responsible: string;

  rca_id?: string; // Vínculo com uma análise RCA existente
  file_path?: string; // Caminho de rede para arquivo de análise
}

// --- Tipos de Confiabilidade Humana (HRA) ---

export interface HraQuestion {
  id: string;
  category: string;
  question: string;
  question_snapshot?: string;
  answer: 'YES' | 'NO' | '';
  comment: string;
}

export interface HraConclusion {
  id: string;
  label: string;
  selected: boolean;
  description: string;
}

export interface HumanReliabilityAnalysis {
  questions: HraQuestion[];
  conclusions: HraConclusion[];
  validation: {
    isValidated: 'YES' | 'NO' | '';
    comment: string;
  };
}

export interface RootCauseItem {
  id: string;
  root_cause_m_id: string;
  cause: string;
  actions?: ActionRecord[];
}

export interface AdditionalInfo {
  meetingNotes?: string;
  comments?: string;
  historicalInfo?: string;
}

/**
 * Interface mestre de um registro de Análise de Causa Raiz (RCA).
 */
export interface RcaRecord {
  id: string;

  // 1. Cabeçalho e Metadados
  version: string;
  analysis_date: string;
  analysis_duration_minutes: number;
  analysis_type: string;
  status: string;
  participants: string[];
  facilitator: string;

  start_date?: string;
  completion_date?: string;
  requires_operation_support?: boolean;

  // 2. Definição do Evento
  failure_date: string;
  failure_time: string;
  downtime_minutes: number;
  financial_impact: number;
  os_number: string;

  // 3. Localização Técnica
  area_id: string;
  equipment_id: string;
  subgroup_id: string;
  component_type: string;
  asset_name_display?: string;

  // 4. Classificação da Falha
  specialty_id: string;
  failure_mode_id: string;
  failure_category_id: string;

  // 5. Descrição do Problema (5W2H)
  who: string;
  what: string;
  when: string;
  where_description: string;
  problem_description: string;
  potential_impacts: string;
  quality_impacts?: string;

  // 6. Investigação e Causa Raiz
  five_whys: FiveWhy[];
  five_whys_chains?: FiveWhyChain[];
  ishikawa: IshikawaDiagram;
  root_causes: RootCauseItem[];

  // 7. Manutenção de Precisão (Checklist)
  precision_maintenance: PrecisionChecklistItem[];

  // 8. Confiabilidade Humana (HRA)
  human_reliability?: HumanReliabilityAnalysis;

  // 9. Planos e Lições
  containment_actions: ContainmentAction[];
  lessons_learned: string[];
  general_moc_number?: string;

  // 10. Informações Adicionais
  additionalInfo?: AdditionalInfo;

  // 11. Metadados de Arquivo
  file_path?: string;
  trigger_ids?: string[]; // IDs dos Gatilhos vinculados (Issue #80 - Relação N:1)
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document';
  filename: string;
  url: string;
  size?: number;
  label?: string;
  uploaded_at?: string;
}

// --- Tipos de FMEA ---

export interface FmeaMode {
  id: string;
  asset_id: string;
  failure_mode: string;
  potential_effects?: string;
  severity: number;
  potential_causes?: string;
  occurrence: number;
  current_controls?: string;
  detection: number;
  rpn?: number; // Calculado no banco: S * O * D
  recommended_actions?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Estrutura integral de dados para Backup e Restauração.
 */
export interface MigrationData {
  metadata: {
    exportDate: string;
    systemVersion: string;
    recordCount: number;
    description?: string;
  };
  assets?: AssetNode[];
  taxonomy?: TaxonomyConfig;
  records: RcaRecord[];
  actions: ActionRecord[];
  triggers?: TriggerRecord[];
}