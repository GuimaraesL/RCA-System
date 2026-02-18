/**
 * Proposta: Repositório SQL para persistência e consulta de Gatilhos (Triggers) de parada.
 * Fluxo: Gerencia o ciclo de vida dos gatilhos no SQLite, permitindo a criação individual ou em massa (importação) e orquestrando o vínculo com análises RCA.
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { Trigger } from '../../domain/types/RcaTypes';

export class SqlTriggerRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public findAll(): Trigger[] {
        return this.db.query('SELECT * FROM triggers ORDER BY start_date DESC');
    }

    public findById(id: string): Trigger | null {
        const rows = this.db.query('SELECT * FROM triggers WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    public create(trigger: Trigger): void {
        const sql = `
            INSERT INTO triggers (
                id, area_id, equipment_id, subgroup_id, start_date, end_date, 
                duration_minutes, stop_type, stop_reason, comments, 
                analysis_type_id, status, responsible, rca_id, file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        this.db.execute(sql, [
            trigger.id,
            trigger.area_id,
            trigger.equipment_id || null,
            trigger.subgroup_id || null,
            trigger.start_date || null,
            trigger.end_date || null,
            trigger.duration_minutes || 0,
            trigger.stop_type || null,
            trigger.stop_reason || null,
            trigger.comments || null,
            trigger.analysis_type_id || null,
            trigger.status || null,
            trigger.responsible || null,
            trigger.rca_id || null,
            trigger.file_path || null
        ]);
    }

    public update(trigger: Trigger): void {
        const sql = `
            UPDATE triggers SET 
                area_id = ?, equipment_id = ?, subgroup_id = ?, 
                start_date = ?, end_date = ?, duration_minutes = ?, 
                stop_type = ?, stop_reason = ?, comments = ?, 
                analysis_type_id = ?, status = ?, responsible = ?, 
                rca_id = ?, file_path = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        this.db.execute(sql, [
            trigger.area_id,
            trigger.equipment_id || null,
            trigger.subgroup_id || null,
            trigger.start_date || null,
            trigger.end_date || null,
            trigger.duration_minutes || 0,
            trigger.stop_type || null,
            trigger.stop_reason || null,
            trigger.comments || null,
            trigger.analysis_type_id || null,
            trigger.status || null,
            trigger.responsible || null,
            trigger.rca_id || null,
            trigger.file_path || null,
            trigger.id
        ]);
    }

    public delete(id: string): void {
        this.db.execute('DELETE FROM triggers WHERE id = ?', [id]);
    }

    /**
     * Persiste múltiplos gatilhos em uma única transação para otimização de performance.
     * Utiliza INSERT OR REPLACE para garantir a idempotência em processos de sincronização.
     */
    public bulkCreate(triggers: Trigger[]): void {
        this.db.transaction(() => {
            const sql = `
                INSERT OR REPLACE INTO triggers (
                    id, area_id, equipment_id, subgroup_id, start_date, end_date, 
                    duration_minutes, stop_type, stop_reason, comments, 
                    analysis_type_id, status, responsible, rca_id, file_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            for (const trigger of triggers) {
                this.db.execute(sql, [
                    trigger.id,
                    trigger.area_id,
                    trigger.equipment_id || null,
                    trigger.subgroup_id || null,
                    trigger.start_date || null,
                    trigger.end_date || null,
                    trigger.duration_minutes || 0,
                    trigger.stop_type || null,
                    trigger.stop_reason || null,
                    trigger.comments || null,
                    trigger.analysis_type_id || null,
                    trigger.status || null,
                    trigger.responsible || null,
                    trigger.rca_id || null,
                    trigger.file_path || null
                ]);
            }
        });
    }

    public bulkDelete(ids: string[]): void {
        this.db.transaction(() => {
            for (const id of ids) {
                this.db.execute('DELETE FROM triggers WHERE id = ?', [id]);
            }
        });
    }
}