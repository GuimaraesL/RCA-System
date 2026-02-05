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
    analysisStatuses: { id: string; name: string }[];
    mandatoryFields: {
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
