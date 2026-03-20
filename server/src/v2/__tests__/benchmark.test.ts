/**
 * Teste: benchmark.test.ts
 * 
 * Proposta: Avaliar o desempenho do sistema em cenários de alta carga de dados.
 * Ações: Execução cronometrada de operações de criação, leitura e deleção de 1000 registros simultâneos.
 * Execução: Backend Vitest.
 * Fluxo: Geração de lote de dados randômicos -> Inserção em massa (Bulk Create) -> Leitura total -> Deleção em massa -> Comparação de tempos com limites aceitáveis.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RcaService } from '../domain/services/RcaService';
import { SqlRcaRepository } from '../infrastructure/repositories/SqlRcaRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Rca, TaxonomyConfig } from '../domain/types/RcaTypes';
import { randomUUID } from 'crypto';

describe('Performance Benchmark (V2 Core)', () => {
    let repo: SqlRcaRepository;

    const generateBatch = (count: number): Rca[] => {
        return Array.from({ length: count }).map((_, i) => ({
            id: randomUUID(),
            what: `Benchmark Item ${i}`,
            status: 'STATUS-01',
            participants: [],
            root_causes: [],
            created_at: new Date().toISOString()
        } as unknown as Rca));
    };

    beforeEach(async () => {
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();
        db.run("DROP TABLE IF EXISTS actions");
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
            general_moc_number TEXT, attachments TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS rca_investigations (
            id TEXT PRIMARY KEY, rca_id TEXT NOT NULL, 
            method_type TEXT NOT NULL, content TEXT NOT NULL,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        repo = new SqlRcaRepository();
    });

    it('deve processar operações de 1000 registros dentro de limites aceitáveis', () => {
        const BATCH_SIZE = 1000;
        const data = generateBatch(BATCH_SIZE);

        // 1. Criação em Massa
        const startCreate = performance.now();
        repo.bulkCreate(data);
        const endCreate = performance.now();
        const createTime = endCreate - startCreate;
        console.log(` Criação em Massa (1000 itens): ${createTime.toFixed(2)}ms`);

        expect(createTime).toBeLessThan(2000);

        // 2. Leitura de Todos
        const startRead = performance.now();
        const all = repo.findAll();
        const endRead = performance.now();
        const readTime = endRead - startRead;
        console.log(` Leitura de Todos (1000 itens): ${readTime.toFixed(2)}ms`);

        expect(all.length).toBe(BATCH_SIZE);
        expect(readTime).toBeLessThan(500); 

        // 3. Deleção em Massa
        const ids = all.map(r => r.id);
        const startDelete = performance.now();
        repo.bulkDelete(ids);
        const endDelete = performance.now();
        const deleteTime = endDelete - startDelete;
        console.log(` Deleção em Massa (1000 itens): ${deleteTime.toFixed(2)}ms`);

        expect(repo.findAll().length).toBe(0);
        expect(deleteTime).toBeLessThan(2000);
    });
});

