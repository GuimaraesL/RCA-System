/**
 * Proposta: Definições de tipos e interfaces do domínio RCA.
 * Fluxo: Centraliza os contratos de dados utilizados em toda a arquitetura V2 do backend.
 */

export type RcaStatus = 'Em Andamento' | 'Aguardando Verificação' | 'Concluída' | 'Atrasada' | 'Cancelada';

export interface Rca {
    id: string;
    version?: string;

    // Metadados de Auditoria
    created_at?: string;
    updated_at?: string;
    file_path?: string;

    // Status e Cabeçalho da Análise
    analysis_date?: string; // Data de criação da análise
    analysis_duration_minutes?: number; // Duração estimada/calculada
    analysis_type?: string;
    status?: string; // ID da Taxonomia

    // Pessoas e Responsabilidades
    participants?: string[]; // Array de nomes
    facilitator?: string;

    // Cronograma e Prazos
    start_date?: string;
    completion_date?: string; // Data em que foi efetivamente concluída
    requires_operation_support?: boolean;

    // Dados do Evento de Falha
    failure_date?: string;
    failure_time?: string;
    downtime_minutes?: number;
    financial_impact?: number;
    os_number?: string;

    // Localização Técnica (Ativos)
    area_id?: string;
    equipment_id?: string;
    subgroup_id?: string;
    component_type?: string;
    asset_name_display?: string;

    // Classificação Técnica
    specialty_id?: string;
    failure_mode_id?: string;
    failure_category_id?: string;

    // Descrição 5W1H/5W2H
    who?: string;
    what?: string;
    when?: string;
    where_description?: string;
    problem_description?: string;
    potential_impacts?: string;
    quality_impacts?: string;

    // Investigação e Causas
    five_whys?: any[];
    five_whys_chains?: any[];
    ishikawa?: any; // Objeto Fishbone
    root_causes?: any[];

    // Checklists e Metodologias
    precision_maintenance?: any[];
    human_reliability?: any;

    // Planos e Lições
    containment_actions?: any[];
    lessons_learned?: any[];
    general_moc_number?: string;
    additional_info?: any;
    attachments?: Attachment[];
}

export interface TaxonomyConfig {
    analysisTypes?: { id: string; name: string }[];
    analysisStatuses: { id: string; name: string }[];
    specialties?: { id: string; name: string }[];
    failureModes?: { id: string; name: string; specialty_ids?: string[] }[];
    failureCategories?: { id: string; name: string }[];
    componentTypes?: { id: string; name: string }[];
    rootCauseMs?: { id: string; name: string }[];
    triggerStatuses?: { id: string; name: string }[];
    mandatoryFields: {
        trigger?: {
            save: string[];
        };
        rca: {
            create: string[];
            conclude: string[];
        };
    };
}

export interface Action {
    id: string;
    rca_id: string;
    action: string;
    responsible: string;
    date: string;
    status: string; // '1' | '2' | '3' | '4'
    moc_number?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Trigger {
    id: string;
    area_id?: string;
    equipment_id?: string;
    subgroup_id?: string;
    start_date: string;
    end_date?: string;
    duration_minutes?: number;
    stop_type?: string;
    stop_reason?: string;
    comments?: string;
    analysis_type_id?: string;
    status: string;
    responsible?: string;
    rca_id?: string;
    file_path?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Asset {
    id: string;
    name: string;
    type: 'AREA' | 'EQUIPMENT' | 'SUBGROUP';
    parent_id?: string;
    children?: Asset[];
}

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
    rpn?: number;
    recommended_actions?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Attachment {
    id: string;
    type: 'image' | 'video';
    path: string;
    label?: string;
}