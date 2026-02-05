// Rotas CRUD para Actions (sql.js)
// Endpoints: GET, POST, PUT, DELETE /api/actions
//
// Issue #20: Actions trigger automatic RCA status recalculation

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/database';
import { actionSchema } from '../schemas/validation';
import { z } from 'zod';
// Import V2 Service
import { RcaService } from '../v2/domain/services/RcaService';
import { SqlRcaRepository } from '../v2/infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../v2/infrastructure/repositories/SqlActionRepository';

const router = Router();

// ============================================================================
// HELPER FUNCTIONS FOR RCA STATUS RECALCULATION
// ============================================================================

/**
 * Recalculates and updates RCA status using V2 Domain Logic
 */
const recalculateRcaStatus = (rcaId: string): { changed: boolean; newStatus?: string; reason?: string } => {
    // Instantiate V2 Service
    // Note: In a real DI container this would be injected, but here we instantiate on demand
    // to bridge the old router to the new logic.
    const rcaService = new RcaService(
        new SqlRcaRepository(),
        new SqlActionRepository()
    );
    const taxonomyRepo = new SqlTaxonomyRepository();
    const taxonomy = taxonomyRepo.getTaxonomy();

    // Fetch RCA via V2 Service/Repo (ensures consistent view)
    const rca = rcaService['rcaRepo'].findById(rcaId); // Accessing repo directly or use service methods if available?
    // Actually, RcaService doesn't have a public `findById`. 
    // We should rely on the update method of RcaService which incorporates validation.

    // However, the original code fetched data then called calculate logic.
    // RcaService.updateRca(id, data, taxonomy) does ALL of this:
    // 1. Fetches (no, it expects data passed in? No, updateRca takes `data: any`. It merges.)

    // Let's look at RcaService.updateRca signature: 
    // public updateRca(id: string, data: any, taxonomy: TaxonomyConfig)

    if (!rca) return { changed: false };

    // We pass the EXISTING rca data as the "update payload" to trigger a recalculation
    // This effectively "touches" the RCA and forces logic to run.
    const result = rcaService.updateRca(rcaId, rca, taxonomy);

    if (result.statusChanged) {
        console.log(`🔄 RCA ${rcaId} status auto-updated (V2 Logic): ${rca.status} -> ${result.rca.status} (${result.statusReason})`);
        return { changed: true, newStatus: result.rca.status, reason: result.statusReason };
    }

    return { changed: false };
};
// Helper to access Taxonomy Repo which we need to compile
import { SqlTaxonomyRepository } from '../v2/infrastructure/repositories/SqlTaxonomyRepository';

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
