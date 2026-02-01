// Rotas CRUD para Actions (sql.js)
// Endpoints: GET, POST, PUT, DELETE /api/actions
//
// Issue #20: Actions trigger automatic RCA status recalculation

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/database';
import { actionSchema } from '../schemas/validation';
import { z } from 'zod';
import rcaStatusService from '../services/rcaStatusService';

const router = Router();

// ============================================================================
// HELPER FUNCTIONS FOR RCA STATUS RECALCULATION
// ============================================================================

/**
 * Fetches the current taxonomy configuration from database
 */
const getTaxonomy = (): any => {
    const db = getDatabase();
    const result = db.exec('SELECT config FROM taxonomy LIMIT 1');
    if (result.length > 0 && result[0].values.length > 0) {
        return JSON.parse(result[0].values[0][0] as string);
    }
    return {
        analysisStatuses: [
            { id: 'STATUS-01', name: 'Em Andamento' },
            { id: 'STATUS-WAITING', name: 'Aguardando Verificação' },
            { id: 'STATUS-03', name: 'Concluída' }
        ],
        mandatoryFields: { rca: { conclude: [] } }
    };
};

/**
 * Fetches an RCA by ID with parsed JSON fields
 */
const getRcaById = (rcaId: string): any | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM rcas WHERE id = ?');
    stmt.bind([rcaId]);
    if (stmt.step()) {
        const row: any = {};
        const cols = stmt.getColumnNames();
        const values = stmt.get();
        cols.forEach((col: string, i: number) => { row[col] = values[i]; });
        stmt.free();
        // Parse JSON fields
        row.participants = JSON.parse(row.participants || '[]');
        row.root_causes = JSON.parse(row.root_causes || '[]');
        row.five_whys = JSON.parse(row.five_whys || '[]');
        row.ishikawa = JSON.parse(row.ishikawa || '{}');
        return row;
    }
    stmt.free();
    return null;
};

/**
 * Fetches all actions for a specific RCA
 */
const getActionsForRca = (rcaId: string): any[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM actions WHERE rca_id = ?');
    stmt.bind([rcaId]);
    const actions: any[] = [];
    while (stmt.step()) {
        const row: any = {};
        const cols = stmt.getColumnNames();
        const values = stmt.get();
        cols.forEach((col: string, i: number) => { row[col] = values[i]; });
        actions.push(row);
    }
    stmt.free();
    return actions;
};

/**
 * Recalculates and updates RCA status after action changes
 * Issue #20: This is the server-side trigger for status updates
 */
const recalculateRcaStatus = (rcaId: string): { changed: boolean; newStatus?: string; reason?: string } => {
    const rca = getRcaById(rcaId);
    if (!rca) return { changed: false };

    const taxonomy = getTaxonomy();
    const actions = getActionsForRca(rcaId);
    const statusResult = rcaStatusService.calculateRcaStatus(rca, actions, taxonomy);

    if (statusResult.statusChanged) {
        const db = getDatabase();
        let updateQuery = 'UPDATE rcas SET status = ?, updated_at = datetime("now")';
        const params: any[] = [statusResult.newStatus];

        if (statusResult.completionDate) {
            updateQuery += ', completion_date = ?';
            params.push(statusResult.completionDate);
        }

        updateQuery += ' WHERE id = ?';
        params.push(rcaId);

        db.run(updateQuery, params);
        saveDatabase();

        console.log(`🔄 RCA ${rcaId} status auto-updated: ${rca.status} -> ${statusResult.newStatus} (${statusResult.reason})`);
        return { changed: true, newStatus: statusResult.newStatus, reason: statusResult.reason };
    }

    return { changed: false };
};

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
// Issue #20: Triggers RCA status recalculation
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();

        const parse = actionSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parse.error.format() });
        }
        const a = parse.data;
        db.run('INSERT INTO actions (id, rca_id, action, responsible, date, status, moc_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [a.id, a.rca_id, a.action, a.responsible, a.date, a.status, a.moc_number]);
        saveDatabase();

        // Issue #20: Recalculate RCA status after adding action
        let rcaStatusUpdate: { changed: boolean; newStatus?: string; reason?: string } = { changed: false };
        if (a.rca_id) {
            rcaStatusUpdate = recalculateRcaStatus(a.rca_id);
        }

        res.status(201).json({
            id: a.id,
            message: 'Action criada com sucesso',
            rcaStatusChanged: rcaStatusUpdate.changed,
            rcaNewStatus: rcaStatusUpdate.newStatus
        });
    } catch (error) {
        console.error('Erro ao criar action:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/actions/bulk - Importação em massa
router.post('/bulk', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const actionsRaw = req.body;

        if (!Array.isArray(actionsRaw)) {
            return res.status(400).json({ error: 'Body must be an array' });
        }

        const parse = z.array(actionSchema).safeParse(actionsRaw);
        if (!parse.success) {
            return res.status(400).json({ error: 'Dados inválidos no array', details: parse.error.format() });
        }
        const actions = parse.data;

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
// Issue #20: Triggers RCA status recalculation
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();

        const parse = actionSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: parse.error.format() });
        }
        const a = parse.data;
        db.run('UPDATE actions SET rca_id = ?, action = ?, responsible = ?, date = ?, status = ?, moc_number = ?, updated_at = datetime("now") WHERE id = ?',
            [a.rca_id, a.action, a.responsible, a.date, a.status, a.moc_number, req.params.id]);
        saveDatabase();

        // Issue #20: Recalculate RCA status after updating action
        let rcaStatusUpdate: { changed: boolean; newStatus?: string; reason?: string } = { changed: false };
        if (a.rca_id) {
            rcaStatusUpdate = recalculateRcaStatus(a.rca_id);
        }

        res.json({
            message: 'Action atualizada com sucesso',
            rcaStatusChanged: rcaStatusUpdate.changed,
            rcaNewStatus: rcaStatusUpdate.newStatus
        });
    } catch (error) {
        console.error('Erro ao atualizar action:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/actions/:id
// Issue #20: Triggers RCA status recalculation
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();

        // First, get the RCA ID before deleting
        const stmt = db.prepare('SELECT rca_id FROM actions WHERE id = ?');
        stmt.bind([req.params.id]);
        let rcaId: string | null = null;
        if (stmt.step()) {
            rcaId = stmt.get()[0] as string;
        }
        stmt.free();

        db.run('DELETE FROM actions WHERE id = ?', [req.params.id]);
        saveDatabase();

        // Issue #20: Recalculate RCA status after deleting action
        let rcaStatusUpdate: { changed: boolean; newStatus?: string; reason?: string } = { changed: false };
        if (rcaId) {
            rcaStatusUpdate = recalculateRcaStatus(rcaId);
        }

        res.json({
            message: 'Action excluída com sucesso',
            rcaStatusChanged: rcaStatusUpdate.changed,
            rcaNewStatus: rcaStatusUpdate.newStatus
        });
    } catch (error) {
        console.error('Erro ao excluir action:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
// POST /api/actions/bulk-delete - Exclusão em massa
router.post('/bulk-delete', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'Body must contain "ids" array' });
        }

        console.log(`🗑️ Bulk Deleting ${ids.length} Actions...`);

        db.exec('BEGIN TRANSACTION');
        const stmt = db.prepare('DELETE FROM actions WHERE id = ?');

        for (const id of ids) {
            stmt.run([id]);
        }

        stmt.free();
        db.exec('COMMIT');
        saveDatabase();

        console.log(`✅ Bulk Delete Actions Completed: ${ids.length} records.`);
        res.json({ message: `Deleted ${ids.length} actions successfully` });
    } catch (error) {
        console.error('Erro no bulk delete de actions:', error);
        res.status(500).json({ error: 'Erro interno durante exclusão em massa' });
    }
});

export default router;
