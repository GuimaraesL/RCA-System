import { describe, it, expect } from 'vitest';
import { exportToCsv, importFromCsv } from '../csvService';
import { RcaRecord, TaxonomyConfig } from '../../types';
import { z } from 'zod';

// Minimal schema mimic from backend to validate data types
const jsonStruct = z.union([z.record(z.string(), z.any()), z.array(z.any()), z.null()]).optional();
const rcaSchema = z.object({
    id: z.string().optional(),
    what: z.string().nullish(),
    problem_description: z.string().nullish(),
    analysis_type: z.string().nullish(),
    status: z.string().optional(),
    failure_date: z.string().nullish(),
    downtime_minutes: z.coerce.number().optional().default(0),
    financial_impact: z.coerce.number().optional().default(0),
    participants: jsonStruct,
    root_causes: jsonStruct,
    five_whys: jsonStruct,
    ishikawa: jsonStruct,
    potential_impacts: z.string().nullish(),
    lessons_learned: jsonStruct
});

describe('csvService Round-trip Validation', () => {
    const mockTaxonomy: TaxonomyConfig = {
        analysisTypes: [{ id: 'T1', name: 'Mini RCA' }],
        analysisStatuses: [{ id: 'STATUS-03', name: 'Concluída' }],
        specialties: [], failureModes: [], failureCategories: [], componentTypes: [],
        rootCauseMs: [{ id: 'M1', name: 'Máquina' }],
        triggerStatuses: []
    };

    const originalRecord: any = {
        id: 'RCA-TEST-001',
        what: 'Falha Técnica Complexa',
        problem_description: 'Descrição com ; ponto e vírgula e "aspas"',
        analysis_type: 'T1',
        status: 'STATUS-03',
        failure_date: '2024-01-01',
        failure_time: '10:00',
        downtime_minutes: 120,
        financial_impact: 5000,
        area_id: 'AREA-01',
        equipment_id: 'EQ-01',
        subgroup_id: 'SUB-01',
        component_type: 'COMP-01',
        who: 'Operador A',
        when: 'Turno 1',
        where_description: 'Linha de Produção',
        participants: ['User 1', 'User 2'],
        root_causes: [
            { id: 'RC1', root_cause_m_id: 'M1', cause: 'Rolamento quebrado' }
        ],
        five_whys: [
            { id: '1', why_question: 'Por que parou?', answer: 'Motor travou' },
            { id: '2', why_question: 'Por que travou?', answer: 'Superaquecimento' },
            { id: '3', why_question: 'Por que aqueceu?', answer: 'Falta de lubrificação' }
        ],
        ishikawa: { machine: ['Rolamento velho'], method: [], material: [], manpower: [], measurement: [], environment: [] },
        potential_impacts: 'Atraso, Custo',
        lessons_learned: ['Revisar plano'],
        version: '17.0',
        five_whys_chains: [],
        precision_maintenance: [],
        containment_actions: [],
        additionalInfo: { historicalInfo: 'Some notes' }
    };

    it('deve exportar e importar uma RCA mantendo a integridade dos campos de status', () => {
        // 1. Exportar para CSV
        const csvContent = exportToCsv('RECORDS_SUMMARY', { 
            records: [originalRecord],
            taxonomy: mockTaxonomy 
        });

        console.log('--- GENERATED CSV ---');
        console.log(csvContent);

        // 2. Importar de volta
        const result = importFromCsv('RECORDS_SUMMARY', csvContent, {
            records: [], // Contexto vazio para forçar criação
            taxonomy: mockTaxonomy
        });

        expect(result.success).toBe(true);
        const imported = result.data[0];

        // 3. Simular Validação da API (Zod)
        const parse = rcaSchema.safeParse(imported);
        if (!parse.success) {
            console.error('❌ Zod Validation Failed:', JSON.stringify(parse.error.format(), null, 2));
        }
        expect(parse.success).toBe(true);

        // 4. Validações Críticas para o Motor de Status
        expect(imported.id).toBe(originalRecord.id);
        expect(imported.what).toBe(originalRecord.what);
        expect(imported.status).toBe(originalRecord.status);
        expect(typeof imported.potential_impacts).toBe('string');
        
        // Validação de Participantes
        expect(imported.participants).toContain('User 1');
        expect(imported.participants).toContain('User 2');

        // Validação de 5 Porquês (Mínimo 3 preenchidos para status Concluída)
        expect(imported.five_whys.length).toBeGreaterThanOrEqual(3);
        expect(imported.five_whys[0].answer).toBe('Motor travou');

        // Validação de Causas Raiz
        expect(imported.root_causes.length).toBe(1);
        expect(imported.root_causes[0].root_cause_m_id).toBe('M1');
        expect(imported.root_causes[0].cause).toBe('Rolamento quebrado');

        // Validação de Ishikawa
        expect(imported.ishikawa.machine).toContain('Rolamento velho');
    });

    it('deve lidar com campos vazios/null sem quebrar o schema do backend', () => {
        const emptyRecord: any = {
            id: 'RCA-EMPTY',
            what: 'Empty Fields Test',
            participants: [],
            root_causes: [],
            five_whys: [],
            ishikawa: {},
            downtime_minutes: null, // Test null to number conversion
            financial_impact: undefined
        };

        const csvContent = exportToCsv('RECORDS_SUMMARY', { 
            records: [emptyRecord],
            taxonomy: mockTaxonomy 
        });

        const result = importFromCsv('RECORDS_SUMMARY', csvContent, {
            records: [],
            taxonomy: mockTaxonomy
        });

        const imported = result.data[0];
        const parse = rcaSchema.safeParse(imported);
        
        if (!parse.success) {
            console.error('❌ Empty Fields Validation Failed:', JSON.stringify(parse.error.format(), null, 2));
        }
        expect(parse.success).toBe(true);
    });
});
