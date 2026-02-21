/**
 * Proposta: Repositório SQL para gestão de Modos de Falha (FMEA).
 * Fluxo: Gerencia o CRUD de registros FMEA vinculados a ativos técnicos, delegando a persistência ao SQLite.
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { FmeaMode } from '../../domain/types/RcaTypes';

export class SqlFmeaRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public findByAssetId(assetId: string): FmeaMode[] {
        return this.db.query(
            'SELECT * FROM fmea_modes WHERE asset_id = ? ORDER BY rpn DESC',
            [assetId]
        );
    }

    public findById(id: string): FmeaMode | null {
        const rows = this.db.query('SELECT * FROM fmea_modes WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    public findAll(): FmeaMode[] {
        return this.db.query('SELECT * FROM fmea_modes ORDER BY rpn DESC');
    }

    public create(mode: FmeaMode): void {
        const sql = `INSERT INTO fmea_modes
            (id, asset_id, failure_mode, potential_effects, severity, potential_causes, occurrence, current_controls, detection, recommended_actions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        this.db.execute(sql, [
            mode.id,
            mode.asset_id,
            mode.failure_mode,
            mode.potential_effects || null,
            mode.severity,
            mode.potential_causes || null,
            mode.occurrence,
            mode.current_controls || null,
            mode.detection,
            mode.recommended_actions || null
        ]);
    }

    public update(mode: FmeaMode): void {
        const sql = `UPDATE fmea_modes SET
            failure_mode = ?, potential_effects = ?, severity = ?,
            potential_causes = ?, occurrence = ?, current_controls = ?,
            detection = ?, recommended_actions = ?, updated_at = datetime('now')
            WHERE id = ?`;

        this.db.execute(sql, [
            mode.failure_mode,
            mode.potential_effects || null,
            mode.severity,
            mode.potential_causes || null,
            mode.occurrence,
            mode.current_controls || null,
            mode.detection,
            mode.recommended_actions || null,
            mode.id
        ]);
    }

    public delete(id: string): void {
        this.db.execute('DELETE FROM fmea_modes WHERE id = ?', [id]);
    }

    public deleteByAssetId(assetId: string): void {
        this.db.execute('DELETE FROM fmea_modes WHERE asset_id = ?', [assetId]);
    }
}
