/**
 * Teste: import_export.test.ts
 * 
 * Proposta: Validar a compatibilidade de importação de dados da Versão 17 para a arquitetura V2.
 * Ações: Carga de arquivo JSON de migração, processamento via RcaService e validação de integridade no banco de dados SQL.
 * Execução: Backend Vitest com Banco de Dados de Integração.
 * Fluxo: Localização do arquivo de migração -> Inicialização de banco limpo -> Importação de lotes de registros -> Verificação de campos complexos (Ishikawa, 5 Porquês).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RcaService } from '../domain/services/RcaService';
import { SqlRcaRepository } from '../infrastructure/repositories/SqlRcaRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Rca, TaxonomyConfig } from '../domain/types/RcaTypes';
import fs from 'fs';
import path from 'path';

// Carrega amostra de dados reais
const MIGRATION_FILE = path.resolve(__dirname, '../../../../tests/data/rca_migration_v17_consolidated.json');

describe('Import/Export Data Validation', () => {
    let service: RcaService;
    let repo: SqlRcaRepository;
    let sampleData: any[];

    // Mock de taxonomia para validação
    const mockTaxonomy: TaxonomyConfig = {
        analysisStatuses: [
            { id: 'STATUS-01', name: 'Em Andamento' },
            { id: 'STATUS-03', name: 'Concluída' }
        ],
        mandatoryFields: { rca: { create: [], conclude: [] } },
        analysisTypes: [], specialties: [], failureModes: [], failureCategories: [],
        componentTypes: [], rootCauseMs: [], triggerStatuses: []
    };

    beforeEach(async () => {
        // Inicializa DB isolado
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();

        // Recria schema para garantir isolamento e limpeza - Ordem correta de DROP
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
        
        db.run(`CREATE TABLE IF NOT EXISTS actions (
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

        db.run(`CREATE TABLE rca_hra_checklists (
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

        db.run(`CREATE TABLE rca_containment (
            id TEXT PRIMARY KEY, rca_id TEXT NOT NULL, content TEXT NOT NULL,
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

        // Leitura do arquivo
        if (fs.existsSync(MIGRATION_FILE)) {
            const content = fs.readFileSync(MIGRATION_FILE, 'utf-8');
            const json = JSON.parse(content);
            sampleData = json.records || []; 
        } else {
            console.warn("⚠️ Arquivo de migração não encontrado, pulando carga de dados.");
            sampleData = [];
        }
    });

    it('deve importar amostras de dados consolidados V17 com sucesso', () => {
        if (sampleData.length === 0) {
            console.warn("Pulando teste devido à ausência de arquivo de dados");
            return;
        }

        // Testa com os primeiros 10 registros
        const batch = sampleData.slice(0, 10);
        console.log(`Testando importação de ${batch.length} registros...`);

        for (const rawRecord of batch) {
            // Simula processo de importação: Mapeia JSON bruto -> Service Create/Migrate
            const result = service.createRca(rawRecord, mockTaxonomy);

            expect(result.rca).toBeDefined();
            expect(result.rca.id).toBe(rawRecord.id); // Deve preservar o ID

            // Valida preservação da lógica
            if (rawRecord.what) {
                expect(result.rca.what).toBe(rawRecord.what);
            }

            // Valida campos complexos (Arrays/Objetos)
            expect(Array.isArray(result.rca.root_causes)).toBe(true);
            if (rawRecord.root_causes && rawRecord.root_causes.length > 0) {
                expect(result.rca.root_causes!.length).toBeGreaterThan(0);
                expect(result.rca.root_causes![0].cause).toBeDefined();
            }

            console.log(` Importado ${result.rca.id} - ${result.rca.what?.substring(0, 30)}...`);
        }

        // Verifica contagem de persistência
        const all = repo.findAll();
        expect(all.length).toBe(batch.length);
    });

    it('deve lidar com campos especiais (Ishikawa, 5 Porquês) corretamente', () => {
        // Encontra um registro com dados de Ishikawa
        const recordWithIshikawa = sampleData.find(r => r.ishikawa && (r.ishikawa.machine?.length > 0));

        if (!recordWithIshikawa) {
            console.warn("Nenhuma amostra com dados de Ishikawa encontrada para teste");
            return;
        }

        const result = service.createRca(recordWithIshikawa, mockTaxonomy);
        const saved = repo.findById(result.rca.id!);

        expect(saved).toBeDefined();
        expect(saved?.ishikawa).toBeDefined();
        // Verifica propriedade profunda
        expect(saved?.ishikawa?.machine?.length).toBeGreaterThan(0);
        expect(saved?.ishikawa?.machine[0].text).toBe(recordWithIshikawa.ishikawa.machine[0]);
        console.log(" Estrutura de Ishikawa preservada");
    });
});

