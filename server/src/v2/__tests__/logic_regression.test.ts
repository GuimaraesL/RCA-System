/**
 * Teste: logic_regression.test.ts
 * 
 * Proposta: Validar a integridade da lógica de negócios e evitar regressões em fluxos críticos de status.
 * Ações: Criação de cenários complexos de RCA com múltiplas dependências (ações, campos obrigatórios) e validação de transições.
 * Execução: Backend Vitest.
 * Fluxo: Configuração de banco limpo -> Inserção de dados de teste -> Atualização via serviço -> Verificação de mudança de status baseada em regras.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RcaService } from '../domain/services/RcaService';
import { SqlRcaRepository } from '../infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../infrastructure/repositories/SqlActionRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Rca, TaxonomyConfig } from '../domain/types/RcaTypes';

describe('RCA Logic Regression Tests (Status Transitions)', () => {
    let service: RcaService;
    let rcaRepo: SqlRcaRepository;
    let actionRepo: SqlActionRepository;

    const mockTaxonomy: TaxonomyConfig = {
        analysisStatuses: [
            { id: 'STATUS-01', name: 'Em Andamento' },
            { id: 'STATUS-02', name: 'Aguardando Verificação' },
            { id: 'STATUS-03', name: 'Concluída' }
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
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();

        // Configuração do DB - Ordem de exclusão respeitando chaves estrangeiras
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

        rcaRepo = new SqlRcaRepository();
        actionRepo = new SqlActionRepository();
        service = new RcaService(rcaRepo, actionRepo);
    });

    it('deve regredir o status de Concluída para Em Andamento se dados obrigatórios forem removidos', () => {
        // 1. Cria RCA Completa
        const rcaData: Partial<Rca> = {
            what: 'Failure X',
            participants: ['User A'],
            root_causes: [{ id: '1', root_cause_m_id: 'M1', cause: 'Cause A' }],
            five_whys: [{id:'1', answer:'A'}, {id:'2', answer:'B'}, {id:'3', answer:'C'}]
        };
        const create = service.createRca(rcaData, mockTaxonomy);
        expect(create.rca.status).toBe('STATUS-03'); // Deve estar concluída inicialmente

        // 2. Remove Causa Raiz obrigatória
        const updateData: Partial<Rca> = {
            ...create.rca,
            root_causes: [] // Esvazia
        };

        const update = service.updateRca(create.rca.id!, updateData, mockTaxonomy);

        // 3. Verifica Regressão
        expect(update.rca.status).toBe('STATUS-01'); // Volta para Em Andamento
        expect(update.statusReason).toContain('Campos ausentes: root_causes');
    });

    it('deve permanecer em Aguardando Verificação se houver ações pendentes', () => {
        // 1. Configura taxonomia para EXIGIR ações
        const taxonomyWithActions = {
            ...mockTaxonomy,
            mandatoryFields: {
                rca: {
                    create: ['what'],
                    conclude: ['what', 'root_causes', 'participants', 'actions']
                }
            }
        };

        // 2. Cria RCA (Em Andamento inicialmente devido a campos faltando)
        const rcaId = 'rca-with-actions';
        service.createRca({ id: rcaId, what: 'Has Actions' }, taxonomyWithActions);

        // 3. Cria Ação Pendente
        actionRepo.create({
            id: 'act-1',
            rca_id: rcaId,
            action: 'Fix it',
            status: '1', // Pendente
            responsible: 'Bob', date: '2023-01-01'
        });

        // 4. Atualiza RCA para ter TODOS os campos obrigatórios
        const rca = rcaRepo.findById(rcaId)!;
        const updateData = {
            ...rca,
            participants: ['Team'],
            root_causes: [{ id: '1', root_cause_m_id: 'M1', cause: 'Root' }],
            five_whys: [{id:'1', answer:'A'}, {id:'2', answer:'B'}, {id:'3', answer:'C'}]
        };

        const result = service.updateRca(rcaId, updateData, taxonomyWithActions);

        // 5. Verifica que o Status NÃO é Concluída, mas sim Aguardando
        expect(result.rca.status).toBe('STATUS-02');
        expect(result.statusReason).toBe('Aguardando verificação de eficácia das ações obrigatórias');
    });

    it('deve transicionar para Concluída apenas quando a Ação se tornar Efetiva', () => {
        // Configura taxonomia para EXIGIR ações
        const taxonomyWithActions = {
            ...mockTaxonomy,
            mandatoryFields: {
                rca: {
                    create: ['what'],
                    conclude: ['what', 'root_causes', 'participants', 'actions']
                }
            }
        };

        // Configura estado
        const rcaId = 'rca-trans-action';
        service.createRca({
            id: rcaId, what: 'Action Flow',
            participants: ['Team'],
            root_causes: [{ id: '1', root_cause_m_id: 'M1', cause: 'Root' }],
            five_whys: [{id:'1', answer:'A'}, {id:'2', answer:'B'}, {id:'3', answer:'C'}]
        }, taxonomyWithActions);

        // 1. Adiciona Ação Pendente -> Status deve ser Aguardando
        actionRepo.create({
            id: 'act-2', rca_id: rcaId, action: 'Fix',
            status: '1', // Pendente
            responsible: 'Me', date: '2023-01-01'
        });

        // Dispara atualização para calcular status
        let rca = rcaRepo.findById(rcaId)!;
        let result = service.updateRca(rcaId, rca, taxonomyWithActions);
        expect(result.rca.status).toBe('STATUS-02');

        // 2. Atualiza Ação para Efetiva ('3' = Concluída/Efetiva)
        actionRepo.update({
            id: 'act-2', rca_id: rcaId, action: 'Fix',
            status: '3', // Efetiva
            responsible: 'Me', date: '2023-01-01'
        });

        // 3. Dispara atualização da RCA novamente
        result = service.updateRca(rcaId, rca, taxonomyWithActions);

        // 4. Verifica CONCLUÍDA
        expect(result.rca.status).toBe('STATUS-03');
        expect(result.statusReason).toBe('Completo, ações efetivas');
    });
});

