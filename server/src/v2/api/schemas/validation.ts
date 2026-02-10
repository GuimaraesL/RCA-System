/**
 * Proposta: Schemas de validação de dados utilizando a biblioteca Zod.
 * Fluxo: Define as regras de integridade e os tipos esperados para cada entidade (RCA, Gatilho, Ação, Ativo), garantindo a segurança dos dados recebidos via API.
 */

import { z } from 'zod';

/**
 * Auxiliar para campos que podem conter estruturas JSON complexas (Objetos ou Arrays).
 */
const jsonStruct = z.union([z.record(z.string(), z.any()), z.array(z.any()), z.null()]).optional();

/**
 * Schema para Análises RCA.
 * Define tipos rigorosos para campos numéricos e flexibilidade para campos de texto, permitindo o salvamento de rascunhos.
 */
export const rcaSchema = z.object({
    id: z.string().optional(),
    version: z.union([z.string(), z.number()]).optional(),
    analysis_date: z.string().nullish(), 
    analysis_duration_minutes: z.coerce.number().optional().default(0),
    analysis_type: z.string().nullish(),
    status: z.string().optional(),

    participants: jsonStruct,
    facilitator: z.string().nullish(),

    start_date: z.string().nullish(),
    completion_date: z.string().nullish(),
    requires_operation_support: z.coerce.boolean().optional().default(false),

    // Dados do Evento de Falha
    failure_date: z.string().nullish(),
    failure_time: z.string().nullish(),
    downtime_minutes: z.coerce.number().optional().default(0),
    financial_impact: z.coerce.number().optional().default(0),
    os_number: z.string().nullish(),

    // Localização Técnica (Ativos)
    area_id: z.string().nullish(),
    equipment_id: z.string().nullish(),
    subgroup_id: z.string().nullish(),
    component_type: z.string().nullish(),
    asset_name_display: z.string().nullish(),

    // Classificação Técnica
    specialty_id: z.string().nullish(),
    failure_mode_id: z.string().nullish(),
    failure_category_id: z.string().nullish(),

    // Descrição 5W2H
    who: z.string().nullish(),
    what: z.string().nullish(),
    when: z.string().nullish(),
    where_description: z.string().nullish(),
    problem_description: z.string().nullish(),

    potential_impacts: z.string().nullish(),
    quality_impacts: z.string().nullish(),

    // Estruturas Complexas de Investigação
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
    additionalInfo: jsonStruct, 
    file_path: z.string().nullish()
});

/**
 * Schema para Gatilhos (Triggers).
 * Define campos obrigatórios para garantir a rastreabilidade de eventos de parada.
 */
export const triggerSchema = z.object({
    id: z.string().optional(), 
    area_id: z.string().min(1, "Área é obrigatória"),
    equipment_id: z.string().nullish(),
    subgroup_id: z.string().nullish(), 

    start_date: z.string().min(1, { message: "Data de início é obrigatória" }),
    end_date: z.string().min(1, "Data de fim é obrigatória"),
    duration_minutes: z.coerce.number().optional().default(0),

    stop_type: z.string().optional(),
    stop_reason: z.string().optional(),

    comments: z.string().nullish(),
    analysis_type_id: z.string().nullish(), 
    status: z.string().nullish(),
    responsible: z.string().nullish(),
    rca_id: z.string().nullish(),
    file_path: z.string().nullish()
});

export type RcaInput = z.infer<typeof rcaSchema>;
export type TriggerInput = z.infer<typeof triggerSchema>;

/**
 * Schema para Planos de Ação (CAPA).
 */
export const actionSchema = z.object({
    id: z.string().optional(),
    rca_id: z.string().optional(),
    action: z.string().min(1, "Ação não pode ser vazia"),
    responsible: z.string().nullish(),
    date: z.string().nullish(),
    status: z.string().optional(),
    moc_number: z.string().nullish()
});

/**
 * Schema para Ativos Técnicos.
 */
export const assetSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Nome do ativo é obrigatório"),
    type: z.string().min(1, "Tipo do ativo é obrigatório"),
    parent_id: z.string().nullish()
});