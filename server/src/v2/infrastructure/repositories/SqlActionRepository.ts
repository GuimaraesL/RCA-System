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
            action.responsible || null, action.date || null, action.status, action.moc_number || null
        ]);
    }

    public update(action: Action): void {
        const sql = `
            UPDATE actions 
            SET action = ?, responsible = ?, date = ?, status = ?, moc_number = ?
            WHERE id = ?
        `;
        this.db.execute(sql, [
            action.action, action.responsible || null, action.date || null, action.status,
            action.moc_number || null, action.id
        ]);
    }

    public delete(id: string): void {
        this.db.execute('DELETE FROM actions WHERE id = ?', [id]);
    }

    public findById(id: string): Action | null {
        const rows = this.db.query('SELECT * FROM actions WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    public findAll(): Action[] {
        return this.db.query('SELECT * FROM actions ORDER BY created_at DESC');
    }

    public bulkCreate(actions: Action[]): void {
        this.db.transaction(() => {
            for (const action of actions) {
                const sql = `
                    INSERT OR REPLACE INTO actions (id, rca_id, action, responsible, date, status, moc_number)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                this.db.execute(sql, [
                    action.id, action.rca_id, action.action,
                    action.responsible || null, action.date || null, action.status, action.moc_number || null
                ]);
            }
        });
    }

    public bulkDelete(ids: string[]): void {
        this.db.transaction(() => {
            for (const id of ids) {
                this.db.execute('DELETE FROM actions WHERE id = ?', [id]);
            }
        });
    }
}
