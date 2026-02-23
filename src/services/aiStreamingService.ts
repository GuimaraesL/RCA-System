import { RcaRecord } from '../types';

const AI_API_URL = 'http://localhost:8000/analyze';
const INTERNAL_KEY = 'dev-key-change-it';

export interface StreamUpdate {
    type: 'content' | 'recurrence' | 'done' | 'error';
    text?: string;
    data?: any;
}

/**
 * Consome o endpoint de IA via streaming (SSE-like via POST ReadableStream)
 */
export const streamAiAnalysis = async (
    rca: RcaRecord,
    onUpdate: (update: StreamUpdate) => void,
    customMessage?: string
) => {
    const context = customMessage || JSON.stringify({
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
                stream: true
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
                    onUpdate({ type: 'done' });
                    continue;
                }

                try {
                    const parsed = JSON.parse(dataStr);

                    // Novo formato: { type: 'content', delta: '...' }
                    if (parsed.type === 'content' && parsed.delta) {
                        contentBuffer += parsed.delta;
                        onUpdate({ type: 'content', text: contentBuffer });
                    }
                    // Novo formato: { type: 'metadata', recurrences: [...] }
                    else if (parsed.type === 'metadata' && parsed.recurrences) {
                        parsed.recurrences.forEach((r: any) => {
                            onUpdate({ type: 'recurrence', data: r });
                        });
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
