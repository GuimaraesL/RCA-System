import { z } from 'zod';

// Helper for JSON fields which might come as strings or objects
// In POST/PUT, frontend usually sends JSON objects/arrays. We validate them as such or loose types.
const jsonStruct = z.union([z.record(z.string(), z.any()), z.array(z.any()), z.null()]).optional();

// Schema for RCA
// We enforce data types but keep many fields optional as RCAs are often "works in progress"
export const rcaSchema = z.object({
    id: z.string().optional(), // Relaxed to string for safety
    version: z.union([z.string(), z.number()]).optional(),
    analysis_date: z.string().nullish(), // ISO Date string
    analysis_duration_minutes: z.coerce.number().optional().default(0),
    analysis_type: z.string().nullish(),
    status: z.string().optional(),

    // Participants: usually array of strings or objects
    participants: jsonStruct,
    facilitator: z.string().nullish(),

    start_date: z.string().nullish(),
    completion_date: z.string().nullish(),
    requires_operation_support: z.coerce.boolean().optional().default(false),

    // Failure Data
    failure_date: z.string().nullish(),
    failure_time: z.string().nullish(),
    downtime_minutes: z.coerce.number().optional().default(0),
    financial_impact: z.coerce.number().optional().default(0),
    os_number: z.string().nullish(),

    // Assets
    area_id: z.string().nullish(),
    equipment_id: z.string().nullish(),
    subgroup_id: z.string().nullish(),
    component_type: z.string().nullish(),
    asset_name_display: z.string().nullish(),

    // Classification
    specialty_id: z.string().nullish(),
    failure_mode_id: z.string().nullish(),
    failure_category_id: z.string().nullish(),

    // 5W2H - Core Descriptive Fields
    who: z.string().nullish(),
    what: z.string().nullish(),
    when: z.string().nullish(),
    where_description: z.string().nullish(),
    problem_description: z.string().nullish(),

    potential_impacts: z.string().nullish(),
    quality_impacts: z.string().nullish(),

    // Root Cause Analysis Structures
    five_whys: jsonStruct,
    five_whys_chains: jsonStruct,
    ishikawa: jsonStruct,
    root_causes: jsonStruct,
    precision_maintenance: jsonStruct,
    human_reliability: jsonStruct,
    containment_actions: jsonStruct,
    lessons_learned: jsonStruct,

    general_moc_number: z.string().nullish(),
    additional_info: jsonStruct,
    additionalInfo: jsonStruct, // Match JSON payload
    file_path: z.string().nullish()
});

// Schema for Trigger
// Triggers are events, so they MUST have a time and a reason.
// User requirement: All fields mandatory except comments.
export const triggerSchema = z.object({
    id: z.string().optional(), // Relaxed UUID for migration
    area_id: z.string().min(1, "Área é obrigatória"),
    equipment_id: z.string().nullish(),
    subgroup_id: z.string().nullish(), // Relaxed to optional/nullish

    // Mandatory for valid event logging
    start_date: z.string().min(1, { message: "Data de início é obrigatória" }),

    end_date: z.string().min(1, "Data de fim é obrigatória"),
    duration_minutes: z.coerce.number().optional().default(0),

    stop_type: z.string().optional(), // Relaxed constraints if data is messy
    stop_reason: z.string().optional(), // Relaxed constraints

    comments: z.string().nullish(),
    analysis_type_id: z.string().nullish(), // Relaxed if strictly necessary, but ideally should be mapped
    status: z.string().nullish(), // Relaxed
    responsible: z.string().nullish(),
    rca_id: z.string().nullish(),
    file_path: z.string().nullish()
});

export type RcaInput = z.infer<typeof rcaSchema>;
export type TriggerInput = z.infer<typeof triggerSchema>;

// Schema for Action
export const actionSchema = z.object({
    id: z.string().optional(), // Relaxed UUID
    rca_id: z.string().optional(), // Relaxed UUID
    action: z.string().min(1, "Ação não pode ser vazia"),
    responsible: z.string().nullish(),
    date: z.string().nullish(),
    status: z.string().optional(),
    moc_number: z.string().nullish()
});

// Schema for Asset
export const assetSchema = z.object({
    id: z.string().optional(), // Relaxed UUID to support "ACABAMENTO", "SL_1"
    name: z.string().min(1, "Nome do ativo é obrigatório"),
    type: z.string().min(1, "Tipo do ativo é obrigatório"),
    parent_id: z.string().nullish() // Relaxed UUID
});
