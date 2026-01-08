// Rotas CRUD para Triggers (sql.js)
// Endpoints: GET, POST, PUT, DELETE /api/triggers

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/database';

const router = Router();

// Helper para converter resultado sql.js em array de objetos
const queryToArray = (result: any[]): any[] => {
    if (!result || result.length === 0) return [];
    const [data] = result;
    if (!data || !data.values) return [];

    return data.values.map((row: any[]) => {
        const obj: any = {};
        data.columns.forEach((col: string, i: number) => {
            obj[col] = row[i];
        });
        return obj;
    });
};

// GET /api/triggers - Listar todos os gatilhos
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const result = db.exec('SELECT * FROM triggers ORDER BY created_at DESC');
        res.json(queryToArray(result));
    } catch (error) {
        console.error('Erro ao listar triggers:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/triggers/:id - Buscar gatilho por ID
router.get('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const stmt = db.prepare('SELECT * FROM triggers WHERE id = ?');
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
            res.status(404).json({ error: 'Trigger não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar trigger:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Helper: undefined/null → string vazia (evita crash no frontend)
const s = (val: any): string => val === undefined || val === null ? '' : String(val);
const n = (val: any): number => val === undefined || val === null ? 0 : Number(val);

// POST /api/triggers - Criar novo gatilho
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const t = req.body;

        db.run(`
      INSERT INTO triggers (id, area_id, equipment_id, subgroup_id, start_date, end_date, duration_minutes,
        stop_type, stop_reason, comments, analysis_type_id, status, responsible, rca_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            s(t.id), s(t.area_id), s(t.equipment_id), s(t.subgroup_id),
            s(t.start_date), s(t.end_date), n(t.duration_minutes),
            s(t.stop_type), s(t.stop_reason), s(t.comments),
            s(t.analysis_type_id), s(t.status), s(t.responsible), s(t.rca_id)
        ]);

        saveDatabase();
        console.log('✅ Trigger criado:', t.id);
        res.status(201).json({ id: t.id, message: 'Trigger criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar trigger:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/triggers/:id - Atualizar gatilho
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const t = req.body;

        db.run(`
      UPDATE triggers SET area_id = ?, equipment_id = ?, subgroup_id = ?, start_date = ?, end_date = ?,
        duration_minutes = ?, stop_type = ?, stop_reason = ?, comments = ?, analysis_type_id = ?,
        status = ?, responsible = ?, rca_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [
            s(t.area_id), s(t.equipment_id), s(t.subgroup_id), s(t.start_date), s(t.end_date),
            n(t.duration_minutes), s(t.stop_type), s(t.stop_reason), s(t.comments),
            s(t.analysis_type_id), s(t.status), s(t.responsible), s(t.rca_id), req.params.id
        ]);

        saveDatabase();
        console.log('✅ Trigger atualizado:', req.params.id);
        res.json({ message: 'Trigger atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar trigger:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/triggers/:id - Excluir gatilho
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        db.run('DELETE FROM triggers WHERE id = ?', [req.params.id]);
        saveDatabase();
        res.json({ message: 'Trigger excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir trigger:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
