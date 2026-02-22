import { RcaRecord } from '../types';

// Em produção, isso deve vir de import.meta.env.VITE_AI_SERVICE_URL
const AI_API_URL = 'http://localhost:8000/analyze';
const INTERNAL_KEY = 'dev-key-change-it'; 

export interface AIAnalysisResponse {
    rca_id: string;
    ai_insight: string;
    status: string;
}

/**
 * Envia os dados da RCA para o serviço de IA analisar e sugerir melhorias.
 */
export const analyzeRcaWithAI = async (rca: RcaRecord): Promise<AIAnalysisResponse> => {
    // Monta um contexto rico para a IA, focando no problema e ativo
    const context = JSON.stringify({
        title: rca.what,
        description: rca.problem_description || rca.where_description || 'Sem descrição detalhada',
        asset: rca.asset_name_display || 'Ativo não identificado',
        date: rca.failure_date,
        // Enviar causas atuais pode ajudar a IA a refinar ou criticar
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
                context: context
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
