export type RcaStatus = 'Em Andamento' | 'Aguardando Verificação' | 'Concluída' | 'Atrasada' | 'Cancelada';

export interface Rca {
    id: string;
    version?: string;

    // Metadata
    created_at?: string;
    updated_at?: string;
    file_path?: string;

    // Analysis Status
    analysis_date?: string; // Analysis creation date
    analysis_duration_minutes?: number; // Calculated/Estimated
    analysis_type?: string;
    status?: string; // RcaStatus

    // People
    participants?: string[]; // JSON array
    facilitator?: string;

    // Timing
    start_date?: string;
    completion_date?: string; // When it was effectively completed
    requires_operation_support?: boolean;

    // Event Info
    failure_date?: string;
    failure_time?: string;
    downtime_minutes?: number;
    financial_impact?: number;
    os_number?: string;

    // Location
    area_id?: string;
    equipment_id?: string;
    subgroup_id?: string;
    component_type?: string;
    asset_name_display?: string;

    // Classification
    specialty_id?: string;
    failure_mode_id?: string;
    failure_category_id?: string;

    // 5W1H Description
    who?: string;
    what?: string;
    when?: string;
    where_description?: string;
    problem_description?: string;
    potential_impacts?: string;
    quality_impacts?: string;

    // Investigation
    five_whys?: any[];
    five_whys_chains?: any[];
    ishikawa?: any; // Fishbone object
    root_causes?: any[];

    // Checklists
    precision_maintenance?: any[];
    human_reliability?: any;

    // Actions
    containment_actions?: any[];
    lessons_learned?: any[];
    general_moc_number?: string;
    additional_info?: any;
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
