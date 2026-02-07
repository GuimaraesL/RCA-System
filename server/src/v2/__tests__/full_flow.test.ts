/**
 * Teste: full_flow.test.ts
 * 
 * Proposta: Validar o fluxo completo de vida de uma RCA, integrando serviço, repositório e banco de dados.
 * Ações: Criação, atualização com lógica automática de status, busca e deleção final.
 * Execução: Backend Vitest com Banco de Dados de Integração (In-Memory).
 * Fluxo: 1. Criação -> 2. Validação de Persistência -> 3. Atualização de Campos -> 4. Verificação de Lógica de Status -> 5. Deleção -> 6. Verificação de Limpeza.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RcaService } from '../domain/services/RcaService';
import { SqlRcaRepository } from '../infrastructure/repositories/SqlRcaRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Rca, TaxonomyConfig } from '../domain/types/RcaTypes';
import { STATUS_IDS } from '../domain/constants';

describe('V2 Full Flow Integration Test (Service + Repository + DB)', () => {
    let service: RcaService;
    let repo: SqlRcaRepository;

    const mockTaxonomy: TaxonomyConfig = {
        analysisStatuses: [
            { id: STATUS_IDS.IN_PROGRESS, name: 'Em Andamento' },
            { id: STATUS_IDS.WAITING_VERIFICATION, name: 'Aguardando Verificação' },
            { id: STATUS_IDS.CONCLUDED, name: 'Concluída' }
        ],
        mandatoryFields: {
            rca: {
                create: ['what'],
                conclude: ['what', 'root_causes', 'participants']
            }
        },
        analysisTypes: [], specialties: [], failureModes: [], failureCategories: [],
        componentTypes: [], rootCauseMs: [], triggerStatuses: []
    };

    beforeEach(async () => {
        // Inicializa banco limpo
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();

        // Reseta tabelas
        const db = dbConn.getRawDatabase();
        db.run("DROP TABLE IF EXISTS rcas");
        db.run(`CREATE TABLE rcas (
            id TEXT PRIMARY KEY, what TEXT, status TEXT, 
            participants TEXT, root_causes TEXT, 
            analysis_type TEXT, problem_description TEXT, subgroup_id TEXT,
            who TEXT, "when" TEXT, where_description TEXT,
            specialty_id TEXT, failure_mode_id TEXT, failure_category_id TEXT,
            component_type TEXT, downtime_minutes REAL, financial_impact REAL,
            completion_date TEXT,
            created_at TEXT, updated_at TEXT, file_path TEXT, five_whys TEXT, five_whys_chains TEXT,
            ishikawa TEXT, precision_maintenance TEXT, human_reliability TEXT,
            containment_actions TEXT, lessons_learned TEXT, additional_info TEXT,
            version INTEGER, analysis_date TEXT, analysis_duration_minutes REAL,
            facilitator TEXT, start_date TEXT, requires_operation_support INTEGER,
            failure_date TEXT, failure_time TEXT, os_number TEXT,
            area_id TEXT, equipment_id TEXT, asset_name_display TEXT,
            potential_impacts TEXT, quality_impacts TEXT,
            general_moc_number TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS actions (
            id TEXT PRIMARY KEY, rca_id TEXT, action TEXT, 
            responsible TEXT, date TEXT, status TEXT, moc_number TEXT
        )`);

        repo = new SqlRcaRepository();
        service = new RcaService(repo);
    });

    it('deve completar um ciclo de vida total: Criar -> Lógica Automática -> Atualizar -> Deletar', () => {
        try {
            // 1. CRIAÇÃO
            const input: Partial<Rca> = {
                what: 'Integration Test Failure',
                analysis_type: 'Safety'
            };
            const createResult = service.createRca(input, mockTaxonomy);

            expect(createResult.rca.id).toBeDefined();
            expect(createResult.rca.status).toBe(STATUS_IDS.IN_PROGRESS); 

            // Verifica Persistência
            const fetched = repo.findById(createResult.rca.id!);
            expect(fetched).toBeDefined();
            expect(fetched?.what).toBe('Integration Test Failure');

            // 2. ATUALIZAÇÃO (Lógica de Gatilho)
            const updatePayload: Partial<Rca> = {
                ...fetched,
                participants: ['Team A'],
                root_causes: [{ id: 'rc1', cause: 'Leak' }]
            };

            const updateResult = service.updateRca(createResult.rca.id!, updatePayload, mockTaxonomy);

            // Deve transicionar para Concluída (STATUS-03)
            expect(updateResult.rca.status).toBe(STATUS_IDS.CONCLUDED);
            expect(updateResult.statusChanged).toBe(true);

            // 3. BUSCA EM MASSA
            const all = repo.findAll();
            expect(all.length).toBe(1);
            expect(all[0].id).toBe(createResult.rca.id);

            // 4. DELEÇÃO
            const deletionSuccess = service.deleteRca(createResult.rca.id!);
            expect(deletionSuccess).toBe(true);

            const fetchedAfterDelete = repo.findById(createResult.rca.id!);
            expect(fetchedAfterDelete).toBeNull();
        } catch (e) {
            throw e;
        }
    });

    it('deve suportar importação em massa de RCAs (Modo Reparo/Legado)', () => {
        const input: Partial<Rca> = {
            what: 'Integration Test Failure',
            analysis_type: 'Safety'
        };
        const createResult = service.createRca(input, mockTaxonomy);

        const importBatch: Rca[] = [
            {
                ...createResult.rca, 
                id: 'IMPORT-001',
                what: 'Imported Record 1',
                status: STATUS_IDS.CONCLUDED
            },
            {
                ...createResult.rca,
                id: 'IMPORT-002',
                what: 'Imported Record 2',
                status: STATUS_IDS.CANCELLED
            }
        ];

        // Executa bulkCreate diretamente no repositório
        expect(() => repo.bulkCreate(importBatch)).not.toThrow();

        // Verifica existência
        const all = repo.findAll();
        const imported = all.filter(r => r.id.startsWith('IMPORT-'));
        expect(imported.length).toBe(2);

        const r1 = repo.findById('IMPORT-001');
        expect(r1?.what).toBe('Imported Record 1');

        // Valida Upsert (atualizar novamente)
        const updateBatch: Rca[] = [{ ...importBatch[0], what: 'Updated via Import' }];
        repo.bulkCreate(updateBatch);

        const updated = repo.findById('IMPORT-001');
        expect(updated?.what).toBe('Updated via Import');
    });
});
