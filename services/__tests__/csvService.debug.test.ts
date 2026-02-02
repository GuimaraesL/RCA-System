import { describe, it, expect, vi } from 'vitest';
import { importFromCsv } from '../csvService';
import { CsvContextData } from '../csvService';
import { AssetNode, Record as RcaRecord, TriggerRecord, TaxonomyConfig } from '../types';

// Mock generateId
vi.mock('../services/utils', () => ({
    generateId: (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`
}));

// Mock findAssetPath
vi.mock('../../utils/triggerHelpers', () => ({
    findAssetPath: (assets: any[], id: string) => {
        // Simple mock: if id is 'sub1', return path AREA -> EQUIP -> SUB
        if (id === 'sub1') {
            return [
                { id: 'area1', type: 'AREA', name: 'Area 1' },
                { id: 'equip1', type: 'EQUIPMENT', name: 'Equip 1' },
                { id: 'sub1', type: 'SUBGROUP', name: 'Subgroup 1' }
            ];
        }
        return null;
    },
    getAssetName: () => 'Test Asset'
}));

describe('CSV Import Debugging', () => {
    const mockAssets: AssetNode[] = [
        { id: 'area_REF', name: 'REF', type: 'AREA', children: [] },
        {
            id: 'area1', name: 'Area 1', type: 'AREA', children: [
                {
                    id: 'equip1', name: 'Equip 1', type: 'EQUIPMENT', children: [
                        { id: 'sub1', name: 'Subconjunto 1', type: 'SUBGROUP' }
                    ]
                }
            ]
        }
    ];

    const mockTaxonomy: TaxonomyConfig = {
        analysisTypes: [{ id: 'type1', name: 'MINI RCA' }],
        triggerStatuses: [{ id: 'stat1', name: 'Concluído' }],
        mandatoryFields: { trigger: { save: ['status'] } },
        specialties: [],
        failureModes: [],
        failureCategories: [],
        componentTypes: [],
        rootCauseMs: []
    };

    const mockRecords: RcaRecord[] = [
        {
            id: 'rca1',
            file_path: 'C:\\Users\\leona\\Downloads\\DADOS_ANALISE_FALHA\\REF\\2024\\LINHA_B\\10-OUTUBRO\\20241030_MEC_MINIRCA_TRINCA DEVIDO ABERTURA DE VALVULA.xlsm',
            area_id: 'area1',
            equipment_id: 'equip1',
            subgroup_id: 'sub1',
            status: 'concluded',
            what: 'Test Issue',
            why: 'Test Cause',
            when: '2024-01-09',
            where: 'Test Location',
            who: 'Test User',
            how: 'Test How',
            how_much: '100',
            root_causes: [],
            actions: []
        }
    ];

    const context: CsvContextData = {
        assets: mockAssets,
        taxonomy: mockTaxonomy,
        records: mockRecords,
        triggers: []
    };

    it('should import triggers from template even with empty Area if linkable to RCA', () => {
        const csvContent = `AREA;Equip.;Subconjunto;Data/Hora Início;Data/Hora Fim;Duração (min);Tipo Parada;Razão Parada;Comentários;Tipo AF;Status;Responsável;ID AF;Path
REF;;;09/01/2024 00:35;09/01/2024 03:35;180;MECANICA;A 1 - FADIGA;comment;MINI RCA;Concluído;Jonas;rca1;C:\\Users\\leona\\Downloads\\DADOS_ANALISE_FALHA\\REF\\2024\\LINHA_B\\10-OUTUBRO\\20241030_MEC_MINIRCA_TRINCA DEVIDO ABERTURA DE VALVULA.xlsm`;

        const result = importFromCsv('TRIGGERS', csvContent, context, { mode: 'APPEND', inheritHierarchy: true });

        console.log('Result:', JSON.stringify(result, null, 2));

        expect(result.success).toBe(true);
        expect(result.dataType).toBe('TRIGGERS');
        expect(result.data).toBeDefined();
        if (result.data) {
            expect(result.data.length).toBeGreaterThan(0);
            const trigger = result.data[0];
            expect(trigger.area_id).toBe('area1'); // Inherited from RCA because CSV AREA 'REF' is likely not mapped to ID 'area1' directly unless we fix assets mock, but wait. 'REF' matches 'area_REF'.
            // Wait, in my mock 'REF' is 'area_REF'.
            // In real data, 'REF' might NOT be valid. Let's force it to be invalid in mock to test inheritance.
        }
    });

    it('should import triggers from template with INVALID Area but valid RCA Link', () => {
        const csvContent = `AREA;Equip.;Subconjunto;Data/Hora Início;Data/Hora Fim;Duração (min);Tipo Parada;Razão Parada;Comentários;Tipo AF;Status;Responsável;ID AF;Path
INVALID_AREA;;;09/01/2024 00:35;09/01/2024 03:35;180;MECANICA;A 1 - FADIGA;comment;MINI RCA;Concluído;Jonas;rca1;C:\\Users\\leona\\Downloads\\DADOS_ANALISE_FALHA\\REF\\2024\\LINHA_B\\10-OUTUBRO\\20241030_MEC_MINIRCA_TRINCA DEVIDO ABERTURA DE VALVULA.xlsm`;

        const result = importFromCsv('TRIGGERS', csvContent, context, { mode: 'APPEND', inheritHierarchy: true });

        console.log('Result Invalid Area:', JSON.stringify(result, null, 2));

        expect(result.success).toBe(true);
        expect(result.data.length).toBe(1);
        expect(result.data[0].area_id).toBe('area1'); // Inherited from rca1
    });
});
