import { DatabaseConnection } from '../database/DatabaseConnection';
import { Asset } from '../../domain/types/RcaTypes';

export class SqlAssetRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public findAll(): Asset[] {
        return this.db.query('SELECT * FROM assets ORDER BY name ASC');
    }

    public findById(id: string): Asset | null {
        const rows = this.db.query('SELECT * FROM assets WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    public create(asset: Asset): void {
        const sql = 'INSERT INTO assets (id, name, type, parent_id) VALUES (?, ?, ?, ?)';
        this.db.execute(sql, [asset.id, asset.name, asset.type, asset.parent_id || null]);
    }

    public update(asset: Asset): void {
        const sql = 'UPDATE assets SET name = ?, type = ?, parent_id = ? WHERE id = ?';
        this.db.execute(sql, [asset.name, asset.type, asset.parent_id || null, asset.id]);
    }

    public delete(id: string): void {
        this.db.execute('DELETE FROM assets WHERE id = ?', [id]);
    }

    public bulkCreate(assets: Asset[]): void {
        this.db.transaction(() => {
            for (const asset of assets) {
                const sql = 'INSERT OR REPLACE INTO assets (id, name, type, parent_id) VALUES (?, ?, ?, ?)';
                this.db.execute(sql, [asset.id, asset.name, asset.type, asset.parent_id || null]);
            }
        });
    }

    public bulkDelete(ids: string[]): void {
        this.db.transaction(() => {
            for (const id of ids) {
                this.db.execute('DELETE FROM assets WHERE id = ?', [id]);
            }
        });
    }
}
