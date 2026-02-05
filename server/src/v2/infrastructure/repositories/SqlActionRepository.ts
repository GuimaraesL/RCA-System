import { DatabaseConnection } from '../database/DatabaseConnection';
import { Action } from '../../domain/types/RcaTypes';

export class SqlActionRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public findByRcaId(rcaId: string): Action[] {
        return this.db.query('SELECT * FROM actions WHERE rca_id = ?', [rcaId]);
    }

    public create(action: Action): void {
        const sql = `
            INSERT INTO actions (id, rca_id, action, responsible, date, status, moc_number)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        this.db.execute(sql, [
            action.id, action.rca_id, action.action,
            action.responsible, action.date, action.status, action.moc_number || null
        ]);
    }

    public update(action: Action): void {
        const sql = `
            UPDATE actions 
            SET action = ?, responsible = ?, date = ?, status = ?, moc_number = ?
            WHERE id = ?
        `;
        this.db.execute(sql, [
            action.action, action.responsible, action.date, action.status,
            action.moc_number || null, action.id
        ]);
    }
}
