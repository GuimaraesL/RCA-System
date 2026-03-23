/**
 * Teste: SqlRcaRepositoryNormalization.test.ts
 *
 * Proposta: Valida que o repositório SQL persiste corretamente as estruturas
 *           normalizadas de investigacao (rca_investigations) e anexos (rcas_attachments),
 *           garantindo que o mapeamento de volta ao frontend preserve os campos esperados.
 * Acoes: Cria uma RCA com 5 Porques em arvore e outra com anexo de imagem,
 *        verifica que os dados sao recuperados com os campos corretos.
 * Execucao: Backend Vitest
 * Fluxo: beforeEach recria o schema em memoria -> save(rca) -> findById -> assertions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqlRcaRepository } from '../SqlRcaRepository';
import { DatabaseConnection } from '../../database/DatabaseConnection';
import { Rca } from '../../../domain/types/RcaTypes';

describe('SqlRcaRepository Normalization Reproduction', () => {
    let repo: SqlRcaRepository;

    beforeEach(async () => {
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();

        db.run("DROP TABLE IF EXISTS rca_five_whys");
        db.run("DROP TABLE IF EXISTS rca_ishikawa");
        db.run("DROP TABLE IF EXISTS rca_root_causes");
        db.run("DROP TABLE IF EXISTS rca_precision_checklists");
        db.run("DROP TABLE IF EXISTS rca_hra_checklists");
        db.run("DROP TABLE IF EXISTS rca_containment");
        db.run("DROP TABLE IF EXISTS rcas_attachments");
        db.run("DROP TABLE IF EXISTS rcas");
        
        db.run(`CREATE TABLE rcas (
            id TEXT PRIMARY KEY,
            version TEXT,
            analysis_date TEXT,
            analysis_duration_minutes INTEGER,
            analysis_type TEXT,
            status TEXT,
            participants TEXT,
            facilitator TEXT,
            start_date TEXT,
            completion_date TEXT,
            requires_operation_support INTEGER,
            failure_date TEXT,
            failure_time TEXT,
            downtime_minutes INTEGER,
            financial_impact REAL,
            os_number TEXT,
            area_id TEXT,
            equipment_id TEXT,
            subgroup_id TEXT,
            component_type TEXT,
            asset_name_display TEXT,
            specialty_id TEXT,
            failure_mode_id TEXT,
            failure_category_id TEXT,
            who TEXT,
            what TEXT,
            "when" TEXT,
            where_description TEXT,
            problem_description TEXT,
            potential_impacts TEXT,
            quality_impacts TEXT,
            general_moc_number TEXT,
            additional_info TEXT,
            file_path TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`);

        db.run(`CREATE TABLE rca_five_whys (
            id TEXT PRIMARY KEY,
            rca_id TEXT NOT NULL,
            parent_id TEXT,
            question TEXT,
            answer TEXT,
            order_index INTEGER,
            chain_id TEXT,
            cause_effect TEXT,
            content TEXT,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rca_ishikawa (
            id TEXT PRIMARY KEY,
            rca_id TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rca_root_causes (
            id TEXT PRIMARY KEY,
            rca_id TEXT NOT NULL,
            root_cause_m_id TEXT NOT NULL,
            cause TEXT NOT NULL,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rca_precision_checklists (
            rca_id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rca_hra_checklists (
            rca_id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            FOREIGN KEY(rca_id) REFERENCES rcas(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE rca_containment (
            id TEXT PRIMARY KEY,
            rca_id TEXT NOT NULL,
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
    });

    it('CORREÇÃO: 5 Porquês deve ser preservado como árvore (JSON na tabela rcas)', () => {
        const rca: any = {
            id: 'RCA-TREE-01',
            what: 'Tree Test',
            five_whys_chains: [
                {
                    chain_id: 'CHAIN-1',
                    cause_effect: 'Efeito 1',
                    root_node: {
                        id: 'NODE-ROOT',
                        level: 0,
                        cause_effect: 'Causa Raiz',
                        whys: [],
                        children: [
                            {
                                id: 'NODE-CHILD-1',
                                level: 1,
                                cause_effect: 'Porquê 1',
                                whys: [],
                                children: []
                            }
                        ]
                    }
                }
            ]
        };

        repo.save(rca);

        const fetched = repo.findById('RCA-TREE-01');
        
        expect(fetched?.five_whys_chains).toBeDefined();
        expect(fetched?.five_whys_chains![0]).toHaveProperty('root_node');
        expect(fetched?.five_whys_chains![0].root_node.children).toHaveLength(1);
    });

    it('CORREÇÃO: Anexos devem ser mapeados para campos compatíveis com o frontend', () => {
        const rca: any = {
            id: 'RCA-MEDIA-01',
            attachments: [
                {
                    id: 'ATT-1',
                    type: 'image',
                    filename: 'foto.png',
                    url: 'http://localhost:3005/media/foto.png'
                }
            ]
        };

        repo.save(rca);

        const fetched = repo.findById('RCA-MEDIA-01');
        
        // Verifica se o mapeamento ocorreu corretamente (SqlRcaRepository mapeia storage_path -> url)
        expect(fetched?.attachments).toHaveLength(1);
        expect(fetched?.attachments![0]).toHaveProperty('url');
        expect(fetched?.attachments![0].url).toBe('http://localhost:3005/media/foto.png');
        expect(fetched?.attachments![0]).toHaveProperty('type');
        expect(fetched?.attachments![0].type).toBe('image');
    });
});
