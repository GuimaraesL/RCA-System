/**
 * Teste: trigger_repository.test.ts
 * 
 * Proposta: Validar a integridade das operações de banco de dados para a entidade Trigger (Gatilho).
 * Ações: CRUD completo de registros de gatilhos, incluindo validação de inconsistências de schema.
 * Execução: Backend Vitest com Banco de Dados In-Memory.
 * Fluxo: Inicialização de conexão SQL -> Reconstrução do schema da tabela triggers -> Execução de operações individuais e em massa -> Verificação de persistência.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqlTriggerRepository } from '../infrastructure/repositories/SqlTriggerRepository';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { Trigger } from '../domain/types/RcaTypes';

describe('SqlTriggerRepository Integration Test', () => {
    let repo: SqlTriggerRepository;

    beforeEach(async () => {
        const dbConn = DatabaseConnection.getInstance();
        await dbConn.initialize();
        const db = dbConn.getRawDatabase();

        // Configura tabela de triggers limpa usando o schema corrigido
        db.run("DROP TABLE IF EXISTS triggers");
        db.run(`CREATE TABLE triggers (
            id TEXT PRIMARY KEY,
            area_id TEXT,
            equipment_id TEXT,
            subgroup_id TEXT,
            start_date TEXT,
            end_date TEXT,
            duration_minutes INTEGER,
            stop_type TEXT,
            stop_reason TEXT,
            comments TEXT,
            analysis_type_id TEXT,
            status TEXT,
            responsible TEXT,
            rca_id TEXT,
            file_path TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`);

        repo = new SqlTriggerRepository();
    });

    it('deve ter sucesso ao criar um gatilho com o schema completo', () => {
        const trigger: Trigger = {
            id: 'TRG-TEST-001',
            area_id: 'AREA-01',
            start_date: '2023-01-01T10:00',
            end_date: '2023-01-01T11:00',
            status: 'OPEN',
            stop_type: 'Mechanical',
            stop_reason: 'Bearing failure',
            duration_minutes: 60
        };

        // Deve ter sucesso agora que o schema corresponde às expectativas do repositório
        repo.create(trigger);
        const found = repo.findById('TRG-TEST-001');
        expect(found).toBeDefined();
        expect(found?.id).toBe('TRG-TEST-001');
    });

    it('deve atualizar um gatilho', () => {
        const trigger: Trigger = {
            id: 'TRG-UPDATE',
            area_id: 'A1',
            start_date: 'D1',
            end_date: null as any,
            status: 'OLD',
            stop_type: null,
            stop_reason: null,
            comments: null,
            analysis_type_id: null,
            responsible: null,
            rca_id: null,
            file_path: null,
            duration_minutes: 0
        };
        repo.create(trigger);
        repo.update({ ...trigger, status: 'NEW' });
        
        const found = repo.findById('TRG-UPDATE');
        expect(found?.status).toBe('NEW');
    });

    it('deve excluir um gatilho', () => {
        const id = 'TRG-DEL';
        repo.create({ 
            id, area_id: 'A', start_date: 'D', status: 'S',
            end_date: null as any, stop_type: null, stop_reason: null,
            comments: null, analysis_type_id: null, responsible: null,
            rca_id: null, file_path: null, duration_minutes: 0
        });
        expect(repo.findById(id)).toBeDefined();
        repo.delete(id);
        expect(repo.findById(id)).toBeNull();
    });

    it('deve lidar com operações em massa (Bulk)', () => {
        const batch: Trigger[] = [
            { 
                id: 'B1', area_id: 'A', start_date: 'D', status: 'S',
                end_date: null as any, stop_type: null, stop_reason: null,
                comments: null, analysis_type_id: null, responsible: null,
                rca_id: null, file_path: null, duration_minutes: 0
            },
            { 
                id: 'B2', area_id: 'A', start_date: 'D', status: 'S',
                end_date: null as any, stop_type: null, stop_reason: null,
                comments: null, analysis_type_id: null, responsible: null,
                rca_id: null, file_path: null, duration_minutes: 0
            }
        ];
        repo.bulkCreate(batch);
        expect(repo.findAll().length).toBe(2);
        repo.bulkDelete(['B1']);
        expect(repo.findAll().length).toBe(1);
    });
});
