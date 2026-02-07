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

        // Recria schema para garantir isolamento e limpeza
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

            console.log(`✅ Importado ${result.rca.id} - ${result.rca.what?.substring(0, 30)}...`);
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
        expect(saved?.ishikawa?.machine[0]).toBe(recordWithIshikawa.ishikawa.machine[0]);
        console.log("✅ Estrutura de Ishikawa preservada");
    });
});
