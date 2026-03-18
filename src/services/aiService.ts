import { RcaRecord } from '../types';

// Em produção, isso deve vir de import.meta.env.VITE_AI_SERVICE_URL
const AI_API_URL = '/ai/analyze';
const INTERNAL_KEY = 'dev-key-change-it';

export interface SemanticLink {
    source: string;
    target: string;
    score: number;
}

export interface RecurrenceInfo {
    rca_id: string;
    similarity: number;
    title: string;
    level: 'subgroup' | 'equipment' | 'area';
    root_causes?: string;
    actions?: string;
    equipment_name?: string;
    area_name?: string;
    validation_reason?: string;
    discard_reason?: string;
    failure_date?: string;
}

export interface AIAnalysisResponse {
    rca_id: string;
    ai_insight: string;
    status: string;
    recurrences?: RecurrenceInfo[];
    semantic_links?: SemanticLink[];
}

/**
 * Envia os dados da RCA para o serviço de IA analisar e sugerir melhorias.
 */
export const analyzeRcaWithAI = async (rca: RcaRecord): Promise<AIAnalysisResponse> => {
    // Monta um contexto rico para a IA, focando no problema e ativo
    // Enriquecemos com o nome amigável do ativo para evitar "Não identificado"
    const context = JSON.stringify({
        title: rca.what,
        description: rca.problem_description || rca.where_description || 'Sem descrição detalhada',
        asset_display: rca.asset_name_display || 'Ativo em rascunho (Não persistido)',
        date: rca.failure_date,
        // Enviar os IDs ajuda o backend na busca, os nomes ajudam a IA no insight
        hierarchy: {
            area: rca.area_id,
            equipment: rca.equipment_id,
            subgroup: rca.subgroup_id
        },
        current_causes: rca.root_causes?.map(rc => rc.cause).join('; ') || ''
    });

    try {
        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-key': INTERNAL_KEY
            },
            body: JSON.stringify({
                rca_id: rca.id,
                context: context,
                area_id: rca.area_id,
                equipment_id: rca.equipment_id,
                subgroup_id: rca.subgroup_id,
                attachments: rca.attachments?.map(att => ({
                    type: att.type,
                    url: att.url,
                    filename: att.filename
                }))
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Service Error (${response.status}): ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Falha ao comunicar com serviço de IA:', error);
        throw error;
    }
};
