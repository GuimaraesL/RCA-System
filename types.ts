
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
  id: number;
  activity: string;
  status: PrecisionStatus;
}

// 8. Planos e Lições types
export interface ContainmentAction {
  id: string;
  action: string;
  responsible: string;
  date: string; // YYYY-MM-DD
  status: string;
}

// Box Logic Status: 1-Aprovada, 2-Em Andamento, 3-Concluída, 4-Ef. Comprovada
export type ActionStatus = '1' | '2' | '3' | '4';

export interface ActionRecord {
  id: string;
  rca_id: string; // Foreign Key to RcaRecord
  action: string;
  responsible: string;
  date: string; // YYYY-MM-DD
  status: ActionStatus;
  moc_number?: string;
}

export interface RcaRecord {
  id: string; // Internal GUID for system use

  // 1. Cabeçalho e Metadados
  version: string;
  analysis_date: string;
  analysis_duration_minutes: number;
  analysis_type: string; // Stores ID
  status: string; // Stores ID
  participants: string;
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
  component_type: string; // Stores ID
  asset_name_display?: string; 

  // 4. Classificação da Falha
  specialty_id: string; // Stores ID
  failure_mode_id: string; // Stores ID
  failure_category_id: string; // Stores ID

  // 5. Descrição do Problema
  who: string;
  what: string; // Title
  when: string;
  where_description: string;
  problem_description: string;
  potential_impacts: string;
  image_url?: string;

  // 6. Investigação
  five_whys: FiveWhy[];
  ishikawa: IshikawaDiagram;
  root_cause: string;

  // 7. Manutenção de Precisão
  precision_maintenance: PrecisionChecklistItem[];

  // 8. Planos e Lições
  containment_actions: ContainmentAction[];
  // corrective_actions removed -> Now stored in ActionRecord[]
  lessons_learned: string[];
}

export interface MigrationData {
  version: string;
  exportedAt: string;
  assets: AssetNode[];
  records: RcaRecord[];
  actions: ActionRecord[];
  taxonomy: TaxonomyConfig;
}
