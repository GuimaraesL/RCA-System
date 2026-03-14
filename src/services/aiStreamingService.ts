import { RcaRecord } from '../types';

const AI_API_URL = '/ai/analyze';
const INTERNAL_KEY = 'dev-key-change-it';

export interface StreamUpdate {
    type: 'content' | 'recurrence' | 'reasoning' | 'suggestions' | 'done' | 'error';
    text?: string;
    suggestions?: string[];
    data?: any;
}

export const fetchChatHistory = async (rcaId: string) => {
    try {
        const url = AI_API_URL.replace('/analyze', `/analyze/history/${rcaId}`);
        const response = await fetch(url, {
            headers: {
                'x-internal-key': INTERNAL_KEY
            }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.messages || [];
    } catch (e) {
        console.error('Failed to fetch AI chat history', e);
        return [];
    }
};

export const fetchSavedRecurrence = async (rcaId: string) => {
    try {
        const url = AI_API_URL.replace('/analyze', `/recurrence/${rcaId}`);
        const response = await fetch(url, {
            headers: {
                'x-internal-key': INTERNAL_KEY
            }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error('Failed to fetch saved recurrence analysis', e);
        return null;
    }
};

export const deleteChatHistory = async (rcaId: string) => {
    try {
        const url = AI_API_URL.replace('/analyze', `/analyze/history/${rcaId}`);
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'x-internal-key': INTERNAL_KEY
            }
        });
        return response.ok;
    } catch (e) {
        console.error('Failed to clear AI chat history', e);
        return false;
    }
};

export const fetchRecurrencesOnly = async (rca: RcaRecord, language: string = 'Portuguese') => {
    const context = JSON.stringify({
        title: rca.what,
        description: rca.problem_description || rca.where_description || 'Sem descrição detalhada',
        asset_display: rca.asset_name_display || 'Ativo em rascunho',
        date: rca.failure_date,
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
                ui_language: language,
                stream: false,
                metadata_only: true
            })
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error('Failed to fetch recurrences only', e);
        return null;
    }
};

/**
 * Consome o endpoint de IA via streaming (SSE-like via POST ReadableStream)
 */
export const streamAiAnalysis = async (
    rca: RcaRecord,
    onUpdate: (update: StreamUpdate) => void,
    language: string = 'Portuguese',
    customMessage?: string
) => {
    const context = JSON.stringify({
        title: rca.what,
        description: rca.problem_description || rca.where_description || 'Sem descrição detalhada',
        asset_display: rca.asset_name_display || 'Ativo em rascunho',
        date: rca.failure_date,
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
                'x-internal-key': INTERNAL_KEY,
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify({
                rca_id: rca.id,
                context: context,
                area_id: rca.area_id,
                equipment_id: rca.equipment_id,
                subgroup_id: rca.subgroup_id,
                user_prompt: customMessage,
                ui_language: language,
                stream: true,
                attachments: rca.attachments?.map(att => ({
                    type: att.type,
                    url: att.url,
                    filename: att.filename
                }))
            })
        });

        if (!response.ok) {
            throw new Error(`Falha no serviço de IA: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('Corpo da resposta vazio');

        let accumulatedText = '';
        let contentBuffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Processa chunks formatados como SSE (data: ...)
            const lines = (accumulatedText + chunk).split('\n');
            // O último elemento pode ser incompleto, salvamos para o próximo chunk
            accumulatedText = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine.startsWith('data: ')) continue;

                const dataStr = trimmedLine.replace('data: ', '').trim();
                if (!dataStr) continue;

                if (dataStr === '[DONE]') {
                    onUpdate({ type: 'done', text: contentBuffer });
                    continue;
                }

                try {
                    const parsed = JSON.parse(dataStr);

                    // Novo formato: { type: 'content', delta: '...' }
                    if (parsed.type === 'content' && parsed.delta) {
                        contentBuffer += parsed.delta;
                        onUpdate({ type: 'content', text: contentBuffer });
                    }
                    // Novo formato: { type: 'metadata', subgroup_matches: [...], equipment_matches: [...], area_matches: [...] }
                    else if (parsed.type === 'metadata' && (parsed.subgroup_matches || parsed.equipment_matches || parsed.area_matches || parsed.recurrences)) {
                        // Formato novo: listas separadas
                        if (parsed.subgroup_matches || parsed.equipment_matches || parsed.area_matches || parsed.discarded_matches) {
                            // Envia as listas separadas como metadata estruturado
                            onUpdate({ 
                                type: 'recurrence', 
                                data: { 
                                    subgroup: parsed.subgroup_matches || [], 
                                    equipment: parsed.equipment_matches || [], 
                                    area: parsed.area_matches || [],
                                    discarded: parsed.discarded_matches || []
                                } 
                            });
                        }
                        // Fallback: formato legado
                        else if (parsed.recurrences) {
                            parsed.recurrences.forEach((r: any) => {
                                onUpdate({ type: 'recurrence', data: r });
                            });
                        }
                    }
                    // Novo formato de Thought Streaming: { type: 'reasoning', text: '...' }
                    else if (parsed.type === 'reasoning' && parsed.text) {
                        onUpdate({ type: 'reasoning', text: parsed.text });
                    }
                    // Novo formato de Sugestões: { type: 'suggestions', suggestions: ['...', '...'] }
                    else if (parsed.type === 'suggestions' && parsed.suggestions) {
                        onUpdate({ type: 'suggestions', suggestions: parsed.suggestions });
                    }
                    // Legado/Backup: Se for string pura
                    else if (typeof parsed === 'string') {
                        contentBuffer += parsed;
                        onUpdate({ type: 'content', text: contentBuffer });
                    }
                } catch (e) {
                    // Fallback se não for JSON válido (pode ser texto puro)
                    console.warn('Falha ao parsear chunk SSE:', dataStr);
                }
            }
        }

    } catch (error) {
        console.error('Erro no streaming da IA:', error);
        onUpdate({ type: 'error', text: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
};
