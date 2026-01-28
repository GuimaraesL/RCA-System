// Rotas CRUD para Assets (sql.js)
// Endpoints: GET, POST, PUT, DELETE /api/assets

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/database';
import { assetSchema } from '../schemas/validation';
import { z } from 'zod';

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

// GET /api/assets/:id - Obter asset específico (Faltava este endpoint)
router.get('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const stmt = db.prepare('SELECT * FROM assets WHERE id = ?');
        stmt.bind([req.params.id]);

        if (stmt.step()) {
            const row = stmt.get();
            const columns = stmt.getColumnNames();
            const asset: any = {};
            columns.forEach((col, i) => { asset[col] = row[i]; });

            stmt.free();
            res.json(asset);
        } else {
            stmt.free();
            res.status(404).json({ error: 'Asset não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar asset:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

import { randomUUID } from 'crypto';

// POST /api/assets
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();

        const parse = assetSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parse.error.format() });
        }
        const { id, name, type, parent_id } = parse.data;

        // 2. Geração de ID se não fornecido
        const finalId = id || randomUUID();

        // 3. Inserção
        try {
            db.run('INSERT INTO assets (id, name, type, parent_id) VALUES (?, ?, ?, ?)',
                [finalId, name, type, parent_id || null]);

            saveDatabase();
            res.status(201).json({
                id: finalId,
                name,
                type,
                parent_id: parent_id || null,
                message: 'Asset criado com sucesso'
            });
        } catch (dbError: any) {
            // Tratar erro de constraint (Unique)
            if (dbError.message && dbError.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'Asset com este ID já existe.' });
            }
            // Tratar erro de FK
            if (dbError.message && dbError.message.includes('FOREIGN KEY constraint failed')) {
                return res.status(400).json({ error: 'Parent ID inválido não encontrado.' });
            }
            throw dbError; // Repassar para catch externo
        }

    } catch (error) {
        console.error('Erro ao criar asset:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao criar asset' });
    }
});

// POST /api/assets/bulk - Importar múltiplos
router.post('/bulk', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const assets = req.body;
        let successCount = 0;
        let errorCount = 0;

        // Recomendado: Usar transação para sql.js se disponível via run('BEGIN;'),
        // por enquanto iteramos com segurança.

        // Validação item a item para permitir importação parcial
        assets.forEach((item: any) => {
            try {
                const parse = assetSchema.safeParse(item);
                if (!parse.success) {
                    errorCount++;
                    return;
                }
                const a = parse.data;

                db.run('INSERT OR REPLACE INTO assets (id, name, type, parent_id) VALUES (?, ?, ?, ?)',
                    [a.id, a.name, a.type, a.parent_id || null]);
                successCount++;
            } catch (err) {
                console.error(`❌ Erro ao importar asset individual [${item.id}]:`, err);
                errorCount++;
            }
        });

        saveDatabase();
        console.log(`✅ Bulk Import assets: ${successCount} sucessos, ${errorCount} erros.`);
        res.status(201).json({
            message: `${successCount} assets importados com sucesso.`,
            errors: errorCount
        });
    } catch (error) {
        console.error('Erro crítico no bulk import de assets:', error);
        res.status(500).json({ error: 'Erro interno ao processar lote de assets' });
    }
});

// PUT /api/assets/:id
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();

        const parse = assetSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parse.error.format() });
        }
        const a = parse.data;
        db.run('UPDATE assets SET name = ?, type = ?, parent_id = ? WHERE id = ?',
            [a.name, a.type, a.parent_id || null, req.params.id]);
        saveDatabase();
        res.json({
            id: req.params.id,
            name: a.name,
            type: a.type,
            parent_id: a.parent_id || null,
            message: 'Asset atualizado com sucesso'
        });
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
