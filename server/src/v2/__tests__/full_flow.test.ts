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

        // Reseta tabelas - Ordem de exclusão respeitando chaves estrangeiras
        const db = dbConn.getRawDatabase();
        db.run("DROP TABLE IF EXISTS actions");
        db.run("DROP TABLE IF EXISTS triggers");
        db.run("DROP TABLE IF EXISTS rca_five_whys");
        db.run("DROP TABLE IF EXISTS rca_ishikawa");
        db.run("DROP TABLE IF EXISTS rca_root_causes");
        db.run("DROP TABLE IF EXISTS rca_precision_checklists");
        db.run("DROP TABLE IF EXISTS rca_hra_checklists");
        db.run("DROP TABLE IF EXISTS rca_containment");
        db.run("DROP TABLE IF EXISTS rcas_attachments");
        db.run("DROP TABLE IF EXISTS rcas");

        db.run(`CREATE TABLE rcas (
            id TEXT PRIMARY KEY, what TEXT, status TEXT, 
            participants TEXT,
            analysis_type TEXT, problem_description TEXT, subgroup_id TEXT,
            who TEXT, "when" TEXT, where_description TEXT,
            specialty_id TEXT, failure_mode_id TEXT, failure_category_id TEXT,
            component_type TEXT, downtime_minutes REAL, financial_impact REAL,
            completion_date TEXT,
            created_at TEXT, updated_at TEXT, file_path TEXT,
            version INTEGER, analysis_date TEXT, analysis_duration_minutes REAL,
            facilitator TEXT, start_date TEXT, requires_operation_support INTEGER,
            failure_date TEXT, failure_time TEXT, os_number TEXT,
            area_id TEXT, equipment_id TEXT, asset_name_display TEXT,
            potential_impacts TEXT, quality_impacts TEXT,
            general_moc_number TEXT, additional_info TEXT
        )`);

        db.run(`CREATE TABLE actions (
            id TEXT PRIMARY KEY, rca_id TEXT, action TEXT, 
            responsible TEXT, date TEXT, status TEXT, moc_number TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS triggers (
            id TEXT PRIMARY KEY, rca_id TEXT, status TEXT,
            FOREIGN KEY(rca_id) REFERENCES rcas(id)
        )`);

        db.run(`CREATE TABLE rca_five_whys (
            id TEXT PRIMARY KEY, rca_id TEXT NOT NULL, parent_id TEXT,
            question TEXT, answer TEXT, order_index INTEGER, chain_id TEXT, cause_effect TEXT, content TEXT,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rca_ishikawa (
            id TEXT PRIMARY KEY, rca_id TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rca_root_causes (
            id TEXT PRIMARY KEY, rca_id TEXT NOT NULL, root_cause_m_id TEXT NOT NULL, cause TEXT NOT NULL,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rca_precision_checklists (
            rca_id TEXT PRIMARY KEY,
            chk_clean_status TEXT, chk_clean_comment TEXT,
            chk_tol_status TEXT, chk_tol_comment TEXT,
            chk_lube_status TEXT, chk_lube_comment TEXT,
            chk_belt_status TEXT, chk_belt_comment TEXT,
            chk_load_status TEXT, chk_load_comment TEXT,
            chk_align_status TEXT, chk_align_comment TEXT,
            chk_bal_status TEXT, chk_bal_comment TEXT,
            chk_torque_status TEXT, chk_torque_comment TEXT,
            chk_parts_status TEXT, chk_parts_comment TEXT,
            chk_func_status TEXT, chk_func_comment TEXT,
            chk_doc_status TEXT, chk_doc_comment TEXT,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS rca_hra_checklists (
            rca_id TEXT PRIMARY KEY,
            q_1_1_answer TEXT, q_1_1_comment TEXT,
            q_1_3_answer TEXT, q_1_3_comment TEXT,
            q_1_4_answer TEXT, q_1_4_comment TEXT,
            q_2_1_answer TEXT, q_2_1_comment TEXT,
            q_2_2_answer TEXT, q_2_2_comment TEXT,
            q_3_1_answer TEXT, q_3_1_comment TEXT,
            q_4_1_answer TEXT, q_4_1_comment TEXT,
            q_4_2_answer TEXT, q_4_2_comment TEXT,
            q_5_1_answer TEXT, q_5_1_comment TEXT,
            q_6_1_answer TEXT, q_6_1_comment TEXT,
            q_6_2_answer TEXT, q_6_2_comment TEXT,
            c_procedures_selected INTEGER, c_procedures_description TEXT,
            c_training_selected INTEGER, c_training_description TEXT,
            c_external_selected INTEGER, c_external_description TEXT,
            c_routine_selected INTEGER, c_routine_description TEXT,
            c_organization_selected INTEGER, c_organization_description TEXT,
            c_measures_selected INTEGER, c_measures_description TEXT,
            is_validated TEXT,
            validation_comment TEXT,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS rca_containment (
            id TEXT PRIMARY KEY, rca_id TEXT NOT NULL, 
            content TEXT NOT NULL,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rcas_attachments (
            id TEXT PRIMARY KEY,
            rca_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            storage_path TEXT NOT NULL,
            file_type TEXT,
            size_bytes INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
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
                root_causes: [{ id: 'rc1', root_cause_m_id: 'M1', cause: 'Leak' }],
                five_whys: [{id:'1', answer:'A'}, {id:'2', answer:'B'}, {id:'3', answer:'C'}]
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

