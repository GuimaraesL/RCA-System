import { describe, it, expect, beforeEach } from 'vitest';
import { SqlRcaRepository } from '../SqlRcaRepository';
import { DatabaseConnection } from '../../database/DatabaseConnection';
import { Rca } from '../../../domain/types/RcaTypes';

describe('SqlRcaRepository Integration Test', () => {
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

    it('deve salvar um RCA e persistir blocos de investigação em tabelas separadas', () => {
        const rca: Rca = {
            id: 'RCA-TEST-01',
            analysis_type: 'Mini RCA',
            five_whys: [{ id: '1', why_question: 'Q1', answer: 'A1' }],
            ishikawa: { method: ['M1'] }
        };

        repo.save(rca);

        const db = DatabaseConnection.getInstance().getRawDatabase();
        const fwhysRows = db.exec("SELECT * FROM rca_five_whys WHERE rca_id = 'RCA-TEST-01'");
        const ishiRows = db.exec("SELECT * FROM rca_ishikawa WHERE rca_id = 'RCA-TEST-01'");
        
        expect(fwhysRows.length).toBeGreaterThan(0);
        expect(ishiRows.length).toBeGreaterThan(0);
    });

    it('deve carregar um RCA completo reunindo dados de ambas as tabelas', () => {
        const rca: Rca = {
            id: 'RCA-LOAD-01',
            analysis_type: 'RCA Completo',
            five_whys: [{ id: '1', why_question: 'Why?', answer: 'Because' }],
            root_causes: [{ id: '1', root_cause_m_id: 'M1', cause: 'Test Cause' }]
        };

        repo.save(rca);
        const found = repo.findById('RCA-LOAD-01');

        expect(found).not.toBeNull();
        expect(found?.five_whys?.length).toBe(1);
        expect(found?.five_whys?.[0].why_question).toBe('Why?');
        expect(found?.root_causes?.length).toBe(1);
    });

    it('deve suportar deleção em cascata (manual via trigger ou código)', () => {
        const rca: Rca = {
            id: 'RCA-DEL',
            analysis_type: 'Mini RCA',
            five_whys: [{ id: '1', why_question: 'Q1', answer: 'A1' }]
        };

        repo.save(rca);
        expect(repo.findById('RCA-DEL')).not.toBeNull();
        
        repo.delete('RCA-DEL');
        expect(repo.findById('RCA-DEL')).toBeNull();
        
        const db = DatabaseConnection.getInstance().getRawDatabase();
        const rows = db.exec("SELECT COUNT(*) FROM rca_five_whys WHERE rca_id = 'RCA-DEL'");
        expect(rows[0].values[0][0]).toBe(0);
    });

    it('deve persistir e recuperar anexos e 5 porquês em tabelas normalizadas', () => {
        const rca: Rca = {
            id: 'RCA-NORM-01',
            attachments: [
                { id: 'ATT-1', rca_id: 'RCA-NORM-01', filename: 'test.png', storage_path: '/path/1', file_type: 'image/png', size_bytes: 1024 }
            ],
            five_whys_chains: [
                { id: 'FW-1', rca_id: 'RCA-NORM-01', question: 'Q1', answer: 'A1', order_index: 0, chain_id: 'C-1' }
            ]
        };

        repo.save(rca);

        const fetched = repo.findById('RCA-NORM-01');
        expect(fetched?.attachments).toHaveLength(1);
        expect(fetched?.attachments![0].filename).toBe('test.png');
        expect(fetched?.five_whys_chains).toHaveLength(1);
        expect(fetched?.five_whys_chains![0].question).toBe('Q1');

        // Verifica no banco bruto se as tabelas foram preenchidas
        const db = DatabaseConnection.getInstance().getRawDatabase();
        const attRows = db.exec("SELECT * FROM rcas_attachments WHERE rca_id = 'RCA-NORM-01'");
        const fwhysRows = db.exec("SELECT * FROM rca_five_whys WHERE rca_id = 'RCA-NORM-01'");

        expect(attRows.length).toBeGreaterThan(0);
        expect(fwhysRows.length).toBeGreaterThan(0);
    });

    it('deve deletar em cascata anexos ao excluir RCA', () => {
        const rca: Rca = {
            id: 'RCA-CASCADE-01',
            attachments: [{ id: 'ATT-C', rca_id: 'RCA-CASCADE-01', filename: 'c.png', storage_path: '/c' }],
            five_whys_chains: [{ id: 'FW-C', rca_id: 'RCA-CASCADE-01', question: 'C?', answer: 'C' }]
        };

        repo.save(rca);
        repo.delete('RCA-CASCADE-01');

        const db = DatabaseConnection.getInstance().getRawDatabase();
        const attRows = db.exec("SELECT COUNT(*) FROM rcas_attachments WHERE rca_id = 'RCA-CASCADE-01'");
        const rcaRows = db.exec("SELECT COUNT(*) FROM rcas WHERE id = 'RCA-CASCADE-01'");

        expect(attRows[0].values[0][0]).toBe(0);
        expect(rcaRows[0].values[0][0]).toBe(0);
    });
});
