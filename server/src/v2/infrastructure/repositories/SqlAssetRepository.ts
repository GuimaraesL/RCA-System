/**
 * Proposta: Repositório SQL para gestão de Ativos Técnicos.
 * Fluxo: Gerencia o CRUD de ativos no SQLite e orquestra a reconstrução da árvore hierárquica (Área > Equipamento > Subgrupo) a partir de linhas planas do banco.
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { Asset } from '../../domain/types/RcaTypes';

export class SqlAssetRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public findAll(): Asset[] {
        const rows = this.db.query('SELECT * FROM assets ORDER BY name ASC');
        return this.buildTree(rows);
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

    /**
     * Auxiliar privado para reconstruir a estrutura de árvore a partir das linhas planas do banco de dados.
     * Utiliza um Mapa (Map) para garantir performance O(N) na reconstrução.
     */
    private buildTree(rows: any[]): Asset[] {
        const nodeMap = new Map<string, Asset>();
        const roots: Asset[] = [];

        // 1. Instancia todos os nós no mapa para referência rápida
        rows.forEach(row => {
            nodeMap.set(row.id, {
                id: row.id,
                name: row.name,
                type: row.type,
                parent_id: row.parent_id || undefined,
                children: []
            });
        });

        // 2. Monta a hierarquia vinculando filhos aos seus respectivos pais
        nodeMap.forEach(node => {
            if (node.parent_id && nodeMap.has(node.parent_id)) {
                const parent = nodeMap.get(node.parent_id);
                parent?.children?.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }
}