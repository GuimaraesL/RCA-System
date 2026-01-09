// Rotas CRUD para Actions (sql.js)
// Endpoints: GET, POST, PUT, DELETE /api/actions

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

// GET /api/actions
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { rca_id } = req.query;

        let result;
        if (rca_id) {
            const stmt = db.prepare('SELECT * FROM actions WHERE rca_id = ? ORDER BY created_at DESC');
            stmt.bind([rca_id as string]);
            const rows: any[] = [];
            while (stmt.step()) {
                const row: any = {};
                const cols = stmt.getColumnNames();
                const values = stmt.get();
                cols.forEach((col: string, i: number) => { row[col] = values[i]; });
                rows.push(row);
            }
            stmt.free();
            res.json(rows);
        } else {
            result = db.exec('SELECT * FROM actions ORDER BY created_at DESC');
            res.json(queryToArray(result));
        }
    } catch (error) {
        console.error('Erro ao listar actions:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/actions/:id
router.get('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const stmt = db.prepare('SELECT * FROM actions WHERE id = ?');
        stmt.bind([req.params.id]);

        if (stmt.step()) {
            const row: any = {};
            const cols = stmt.getColumnNames();
            const values = stmt.get();
            cols.forEach((col: string, i: number) => { row[col] = values[i]; });
            stmt.free();
            res.json(row);
        } else {
            stmt.free();
            res.status(404).json({ error: 'Action não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao buscar action:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/actions
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const a = req.body;
        db.run('INSERT INTO actions (id, rca_id, action, responsible, date, status, moc_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [a.id, a.rca_id, a.action, a.responsible, a.date, a.status, a.moc_number]);
        saveDatabase();
        res.status(201).json({ id: a.id, message: 'Action criada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar action:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/actions/bulk - Importação em massa
router.post('/bulk', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const actions = req.body;

        if (!Array.isArray(actions)) {
            return res.status(400).json({ error: 'Body must be an array' });
        }

        console.log(`🔄 Bulk Importing ${actions.length} Actions...`);

        db.exec('BEGIN TRANSACTION');
        const stmt = db.prepare('INSERT OR REPLACE INTO actions (id, rca_id, action, responsible, date, status, moc_number) VALUES (?, ?, ?, ?, ?, ?, ?)');

        for (const a of actions) {
            stmt.run([a.id, a.rca_id, a.action, a.responsible, a.date, a.status, a.moc_number]);
        }

        stmt.free();
        db.exec('COMMIT');
        saveDatabase();

        console.log(`✅ Bulk Import Actions Completed: ${actions.length} records.`);
        res.json({ message: `Imported ${actions.length} actions successfully` });
    } catch (error) {
        console.error('Erro no bulk import de actions:', error);
        res.status(500).json({ error: 'Erro interno durante importação em massa' });
    }
});

// PUT /api/actions/:id
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const a = req.body;
        db.run('UPDATE actions SET rca_id = ?, action = ?, responsible = ?, date = ?, status = ?, moc_number = ?, updated_at = datetime("now") WHERE id = ?',
            [a.rca_id, a.action, a.responsible, a.date, a.status, a.moc_number, req.params.id]);
        saveDatabase();
        res.json({ message: 'Action atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar action:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/actions/:id
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        db.run('DELETE FROM actions WHERE id = ?', [req.params.id]);
        saveDatabase();
        res.json({ message: 'Action excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir action:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
