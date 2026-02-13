
import { AssetNode, ActionRecord, TaxonomyConfig, RcaRecord, TriggerRecord } from "../../types";

export interface CsvContextData {
    records?: RcaRecord[];
    assets?: AssetNode[];
    actions?: ActionRecord[];
    triggers?: TriggerRecord[];
    taxonomy?: TaxonomyConfig;
}

export interface CsvImportResult {
    success: boolean;
    message: string;
    data?: any;
    dataType?: CsvEntityType;
}

export type CsvEntityType =
    | 'ASSETS'
    | 'ACTIONS'
    | 'RECORDS_SUMMARY'
    | 'TRIGGERS'
    | 'TAXONOMY_ANALYSIS_TYPES'
    | 'TAXONOMY_STATUSES'
    | 'TAXONOMY_SPECIALTIES'
    | 'TAXONOMY_FAILURE_MODES'
    | 'TAXONOMY_FAILURE_CATEGORIES'
    | 'TAXONOMY_COMPONENT_TYPES'
    | 'TAXONOMY_ROOT_CAUSE_MS'
    | 'TAXONOMY_TRIGGER_STATUSES';

export const TAXONOMY_MAP: Record<string, keyof TaxonomyConfig> = {
    'TAXONOMY_ANALYSIS_TYPES': 'analysisTypes',
    'TAXONOMY_STATUSES': 'analysisStatuses',
    'TAXONOMY_SPECIALTIES': 'specialties',
    'TAXONOMY_FAILURE_MODES': 'failureModes',
    'TAXONOMY_FAILURE_CATEGORIES': 'failureCategories',
    'TAXONOMY_COMPONENT_TYPES': 'componentTypes',
    'TAXONOMY_ROOT_CAUSE_MS': 'rootCauseMs',
    'TAXONOMY_TRIGGER_STATUSES': 'triggerStatuses'
};

// --- VALIDAÇÃO DE SCHEMA ---
// Mapa de colunas obrigatórias para garantir a integridade mínima de cada entidade
export const REQUIRED_HEADERS: Record<CsvEntityType, string[]> = {
    'ASSETS': ['name', 'type'], 
    'ACTIONS': ['action', 'responsible'], 
    'TRIGGERS': ['AREA', 'Equip.', 'Data/Hora Início'], 
    'RECORDS_SUMMARY': ['id'], 
    'TAXONOMY_ANALYSIS_TYPES': ['name'],
    'TAXONOMY_STATUSES': ['name'],
    'TAXONOMY_SPECIALTIES': ['name'],
    'TAXONOMY_FAILURE_MODES': ['name', 'specialty_ids'], 
    'TAXONOMY_FAILURE_CATEGORIES': ['name'],
    'TAXONOMY_COMPONENT_TYPES': ['name'],
    'TAXONOMY_ROOT_CAUSE_MS': ['name'],
    'TAXONOMY_TRIGGER_STATUSES': ['name']
};
