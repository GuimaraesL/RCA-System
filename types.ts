
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
}

export interface TaxonomyConfig {
  analysisTypes: TaxonomyItem[];
  analysisStatuses: TaxonomyItem[];
  specialties: TaxonomyItem[];
  failureModes: TaxonomyItem[];
  failureCategories: TaxonomyItem[];
  componentTypes: TaxonomyItem[];
  rootCauseMs: TaxonomyItem[];
}

// 6. Investigação types
export interface FiveWhy {
  id: string;
  why_question: string;
  answer: string;
}

export interface IshikawaDiagram {
  method: string[];
  machine: string[];
  material: string[];
  manpower: string[];
  measurement: string[];
  environment: string[];
}

// 7. Manutenção de Precisão types
export type PrecisionStatus = "EXECUTED" | "NOT_EXECUTED" | "NOT_APPLICABLE";

export interface PrecisionChecklistItem {
  id: string; // Semantic ID (slug)
  activity: string; // Current text definition
  question_snapshot?: string; // Historical text at time of record
  status: PrecisionStatus;
  comment?: string;
}

// 8. Planos e Lições types
export interface ContainmentAction {
  id: string;
  action: string;
  responsible: string;
  date: string; // YYYY-MM-DD
  status: string;
}

// Box Logic Status
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

// Human Reliability Analysis Types
export interface HraQuestion {
  id: string;
  category: string;
  question: string;
  question_snapshot?: string; // Historical text
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
}

export interface AdditionalInfo {
    meetingNotes?: string;
    comments?: string;
    historicalInfo?: string;
}

export interface RcaRecord {
  id: string;

  // 1. Cabeçalho e Metadados
  version: string;
  analysis_date: string;
  analysis_duration_minutes: number;
  analysis_type: string;
  status: string;
  participants: string[]; // Normalized to Array
  facilitator: string;

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

  // 5. Descrição do Problema
  who: string;
  what: string;
  when: string;
  where_description: string;
  problem_description: string;
  potential_impacts: string;
  // REMOVED: image_url (Binary data removed for production DTO)

  // 6. Investigação
  five_whys: FiveWhy[];
  ishikawa: IshikawaDiagram;
  
  root_causes: RootCauseItem[];

  // 7. Manutenção de Precisão
  precision_maintenance: PrecisionChecklistItem[];

  // 8. Human Reliability Analysis
  human_reliability?: HumanReliabilityAnalysis;

  // 9. Planos e Lições
  containment_actions: ContainmentAction[];
  lessons_learned: string[];

  // 10. Additional Info
  additionalInfo?: AdditionalInfo;
}

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
}
