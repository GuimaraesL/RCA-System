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

        db.run("DROP TABLE IF EXISTS actions");
        db.run(`CREATE TABLE actions (
            id TEXT PRIMARY KEY, rca_id TEXT, action TEXT, 
            responsible TEXT, date TEXT, status TEXT, moc_number TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS triggers (
            id TEXT PRIMARY KEY, rca_id TEXT, status TEXT,
            FOREIGN KEY(rca_id) REFERENCES rcas(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS rca_investigations (
            id TEXT PRIMARY KEY, rca_id TEXT NOT NULL, 
            method_type TEXT NOT NULL, content TEXT NOT NULL,
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

