// Rotas CRUD para Assets (sql.js)
// Endpoints: GET, POST, PUT, DELETE /api/assets

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/database';

const router = Router();

// Helper para converter resultado sql.js
const queryToArray = (result: any[]): any[] => {
    if (!result || result.length === 0) return [];
    const [data] = result;
    if (!data || !data.values) return [];

    return data.values.map((row: any[]) => {
        const obj: any = {};
        data.columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
        return obj;
    });
};

// Construir árvore hierárquica
const buildAssetTree = (flatAssets: any[]): any[] => {
    const assetMap = new Map();
    const roots: any[] = [];

    flatAssets.forEach(asset => {
        assetMap.set(asset.id, { ...asset, children: [] });
    });

    flatAssets.forEach(asset => {
        const node = assetMap.get(asset.id);
        if (asset.parent_id && assetMap.has(asset.parent_id)) {
            assetMap.get(asset.parent_id).children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
};

// GET /api/assets - Retorna árvore
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const result = db.exec('SELECT * FROM assets ORDER BY name');
        const tree = buildAssetTree(queryToArray(result));
        res.json(tree);
    } catch (error) {
        console.error('Erro ao listar assets:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/assets/flat - Lista plana
router.get('/flat', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const result = db.exec('SELECT * FROM assets ORDER BY name');
        res.json(queryToArray(result));
    } catch (error) {
        console.error('Erro ao listar assets:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/assets
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const a = req.body;
        db.run('INSERT INTO assets (id, name, type, parent_id) VALUES (?, ?, ?, ?)',
            [a.id, a.name, a.type, a.parent_id || null]);
        saveDatabase();
        res.status(201).json({ id: a.id, message: 'Asset criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar asset:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/assets/bulk - Importar múltiplos
router.post('/bulk', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const assets = req.body;

        assets.forEach((a: any) => {
            db.run('INSERT OR REPLACE INTO assets (id, name, type, parent_id) VALUES (?, ?, ?, ?)',
                [a.id, a.name, a.type, a.parent_id || null]);
        });

        saveDatabase();
        res.status(201).json({ message: `${assets.length} assets importados` });
    } catch (error) {
        console.error('Erro ao importar assets:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/assets/:id
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const a = req.body;
        db.run('UPDATE assets SET name = ?, type = ?, parent_id = ? WHERE id = ?',
            [a.name, a.type, a.parent_id || null, req.params.id]);
        saveDatabase();
        res.json({ message: 'Asset atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar asset:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/assets/:id
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        db.run('DELETE FROM assets WHERE id = ?', [req.params.id]);
        saveDatabase();
        res.json({ message: 'Asset excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir asset:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
