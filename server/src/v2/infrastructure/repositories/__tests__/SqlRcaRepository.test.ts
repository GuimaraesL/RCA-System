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

        db.run("DROP TABLE IF EXISTS rca_investigations");
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
            attachments TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`);

        db.run(`CREATE TABLE rca_investigations (
            id TEXT PRIMARY KEY,
            rca_id TEXT NOT NULL,
            method_type TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(rca_id) REFERENCES rcas(id)
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
        const invRows = db.exec("SELECT method_type, content FROM rca_investigations WHERE rca_id = 'RCA-TEST-01'");
        
        expect(invRows.length).toBeGreaterThan(0);
        const values = invRows[0].values;
        expect(values.length).toBe(2);
        
        const methods = values.map(v => v[0]);
        expect(methods).toContain('FIVE_WHYS');
        expect(methods).toContain('ISHIKAWA');
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
        const invRows = db.exec("SELECT COUNT(*) FROM rca_investigations WHERE rca_id = 'RCA-DEL'");
        expect(invRows[0].values[0][0]).toBe(0);
    });
});
