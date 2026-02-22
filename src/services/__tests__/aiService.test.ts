import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeRcaWithAI } from '../aiService';
import { RcaRecord } from '../../types';

describe('Service: aiService (Frontend Integration)', () => {
    const mockRca: RcaRecord = {
        id: 'RCA-TEST-001',
        what: 'Vazamento na bomba',
        problem_description: 'Selo mecânico estourado',
        failure_date: '2026-02-20',
        area_id: 'AREA-1',
        status: 'IN_PROGRESS',
        root_causes: [],
        ishikawa: { machine: [], method: [], manpower: [], material: [], measurement: [], environment: [] },
        five_whys: []
    } as unknown as RcaRecord;

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('deve enviar os dados formatados corretamente para o serviço de IA', async () => {
        const mockResponse = {
            rca_id: 'RCA-TEST-001',
            ai_insight: 'Possível fadiga por desalinhamento.',
            status: 'completed'
        };

        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        } as Response);

        const result = await analyzeRcaWithAI(mockRca);

        expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/analyze'), expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                'x-internal-key': expect.any(String)
            })
        }));

        const callBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
        expect(callBody.rca_id).toBe('RCA-TEST-001');
        expect(JSON.parse(callBody.context).title).toBe('Vazamento na bomba');
        expect(result).toEqual(mockResponse);
    });

    it('deve lançar erro explicativo quando o serviço de IA falha', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error'
        } as Response);

        await expect(analyzeRcaWithAI(mockRca)).rejects.toThrow('AI Service Error (500): Internal Server Error');
    });

    it('deve lançar erro de rede quando o fetch falha', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network Fail'));

        await expect(analyzeRcaWithAI(mockRca)).rejects.toThrow('Network Fail');
    });
});
