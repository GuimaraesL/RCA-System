/**
 * Teste: csvService.debug.test.ts
 * 
 * Proposta: Depurar e validar cenários específicos de importação de CSV, focando em herança de hierarquia e vinculação com RCA.
 * Ações: Simulação de importação de gatilhos com dados parciais ou inválidos para testar a lógica de recuperação via link de RCA.
 * Execução: Frontend Vitest.
 * Fluxo: Mock de serviços de ID e Ativos -> Configuração de contexto com RCAs existentes -> Execução de importação de gatilhos -> Verificação de herança de área/equipamento.
 */

import { describe, it, expect, vi } from 'vitest';
import { importFromCsv } from '../csvService';
import { CsvContextData } from '../csvService';
import { AssetNode, RcaRecord, TriggerRecord, TaxonomyConfig } from '../../types';

// Mock do gerador de ID
vi.mock('../services/utils', () => ({
    generateId: (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`
}));

// Mock do buscador de caminho de ativos
vi.mock('../../utils/triggerHelpers', () => ({
    findAssetPath: (assets: any[], id: string) => {
        // Mock simples: se o ID for 'sub1', retorna o caminho AREA -> EQUIP -> SUB
        if (id === 'sub1') {
            return [
                { id: 'area1', type: 'AREA', name: 'Area 1' },
                { id: 'equip1', type: 'EQUIPMENT', name: 'Equip 1' },
                { id: 'sub1', type: 'SUBGROUP', name: 'Subgroup 1' }
            ];
        }
        return null;
    },
    getAssetName: () => 'Ativo de Teste'
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
        analysisStatuses: [],
        triggerStatuses: [{ id: 'stat1', name: 'Concluído' }],
        mandatoryFields: { trigger: { save: ['status'] }, rca: { create: [], conclude: [] } },
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
            what: 'Problema de Teste',
            when: '2024-01-09',
            where_description: 'Local de Teste',
            who: 'Usuário Teste',
            root_causes: []
        } as unknown as RcaRecord
    ];

    const context: CsvContextData = {
        assets: mockAssets,
        taxonomy: mockTaxonomy,
        records: mockRecords,
        triggers: []
    };

    it('deve importar gatilhos do template mesmo com área vazia se vinculável a uma RCA', () => {
        const csvContent = `AREA;Equip.;Subconjunto;Data/Hora Início;Data/Hora Fim;Duração (min);Tipo Parada;Razão Parada;Comentários;Tipo AF;Status;Responsável;ID AF;Path
REF;;;09/01/2024 00:35;09/01/2024 03:35;180;MECANICA;A 1 - FADIGA;comment;MINI RCA;Concluído;Jonas;rca1;C:\\Users\\leona\\Downloads\\DADOS_ANALISE_FALHA\\REF\\2024\\LINHA_B\\10-OUTUBRO\\20241030_MEC_MINIRCA_TRINCA DEVIDO ABERTURA DE VALVULA.xlsm`;

        const result = importFromCsv('TRIGGERS', csvContent, context, { mode: 'APPEND', inheritHierarchy: true });

        console.log('Resultado:', JSON.stringify(result, null, 2));

        expect(result.success).toBe(true);
        expect(result.dataType).toBe('TRIGGERS');
        expect(result.data).toBeDefined();
        if (result.data) {
            expect(result.data.length).toBeGreaterThan(0);
            const trigger = result.data[0];
            expect(trigger.area_id).toBe('area1'); // Herdado da RCA
        }
    });

    it('deve importar gatilhos do template com área INVÁLIDA mas com link de RCA válido', () => {
        const csvContent = `AREA;Equip.;Subconjunto;Data/Hora Início;Data/Hora Fim;Duração (min);Tipo Parada;Razão Parada;Comentários;Tipo AF;Status;Responsável;ID AF;Path
INVALID_AREA;;;09/01/2024 00:35;09/01/2024 03:35;180;MECANICA;A 1 - FADIGA;comment;MINI RCA;Concluído;Jonas;rca1;C:\\Users\\leona\\Downloads\\DADOS_ANALISE_FALHA\\REF\\2024\\LINHA_B\\10-OUTUBRO\\20241030_MEC_MINIRCA_TRINCA DEVIDO ABERTURA DE VALVULA.xlsm`;

        const result = importFromCsv('TRIGGERS', csvContent, context, { mode: 'APPEND', inheritHierarchy: true });

        console.log('Resultado Área Inválida:', JSON.stringify(result, null, 2));

        expect(result.success).toBe(true);
        expect(result.data.length).toBe(1);
        expect(result.data[0].area_id).toBe('area1'); // Herdado da rca1
    });
});
