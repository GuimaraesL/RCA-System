// Rotas CRUD para Análises RCA (sql.js)
// Endpoints: GET, POST, PUT, DELETE /api/rcas

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/database';

const router = Router();

// Helper para converter undefined em null (sql.js não aceita undefined)
const n = (val: any): any => val === undefined ? null : val;

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

// Parse JSON fields do RCA
const parseRcaRow = (row: any) => ({
    ...row,
    participants: JSON.parse(row.participants || '[]'),
    five_whys: JSON.parse(row.five_whys || '[]'),
    five_whys_chains: JSON.parse(row.five_whys_chains || '[]'), // Task 55
    ishikawa: JSON.parse(row.ishikawa || '{}'),
    root_causes: JSON.parse(row.root_causes || '[]'),
    precision_maintenance: JSON.parse(row.precision_maintenance || '[]'),
    human_reliability: JSON.parse(row.human_reliability || 'null'),
    containment_actions: JSON.parse(row.containment_actions || '[]'),
    lessons_learned: JSON.parse(row.lessons_learned || '[]'),
    additional_info: JSON.parse(row.additional_info || 'null'),
    requires_operation_support: !!row.requires_operation_support
});

// GET /api/rcas - Listar todas as análises
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const result = db.exec('SELECT * FROM rcas ORDER BY created_at DESC');
        const rows = queryToArray(result);
        const rcas = rows.map(parseRcaRow);
        res.json(rcas);
    } catch (error) {
        console.error('Erro ao listar RCAs:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/rcas/:id - Buscar análise por ID
router.get('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const stmt = db.prepare('SELECT * FROM rcas WHERE id = ?');
        stmt.bind([req.params.id]);

        if (stmt.step()) {
            const row: any = {};
            const cols = stmt.getColumnNames();
            const values = stmt.get();
            cols.forEach((col: string, i: number) => { row[col] = values[i]; });
            stmt.free();
            res.json(parseRcaRow(row));
        } else {
            stmt.free();
            res.status(404).json({ error: 'RCA não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao buscar RCA:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/rcas - Criar nova análise
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const rca = req.body;

        db.run(`
      INSERT INTO rcas (
        id, version, analysis_date, analysis_duration_minutes, analysis_type, status,
        participants, facilitator, start_date, completion_date, requires_operation_support,
        failure_date, failure_time, downtime_minutes, financial_impact, os_number,
        area_id, equipment_id, subgroup_id, component_type, asset_name_display,
        specialty_id, failure_mode_id, failure_category_id,
        who, what, "when", where_description, problem_description, potential_impacts, quality_impacts,
        five_whys, five_whys_chains, ishikawa, root_causes,
        precision_maintenance, human_reliability,
        containment_actions, lessons_learned, general_moc_number, additional_info, file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            n(rca.id), n(rca.version), n(rca.analysis_date), n(rca.analysis_duration_minutes) || 0, n(rca.analysis_type), n(rca.status),
            JSON.stringify(rca.participants || []), n(rca.facilitator), n(rca.start_date), n(rca.completion_date), rca.requires_operation_support ? 1 : 0,
            n(rca.failure_date), n(rca.failure_time), n(rca.downtime_minutes) || 0, n(rca.financial_impact) || 0, n(rca.os_number),
            n(rca.area_id), n(rca.equipment_id), n(rca.subgroup_id), n(rca.component_type), n(rca.asset_name_display),
            n(rca.specialty_id), n(rca.failure_mode_id), n(rca.failure_category_id),
            n(rca.who), n(rca.what), n(rca.when), n(rca.where_description), n(rca.problem_description), n(rca.potential_impacts), n(rca.quality_impacts),
            JSON.stringify(rca.five_whys || []), JSON.stringify(rca.five_whys_chains || []), JSON.stringify(rca.ishikawa || {}), JSON.stringify(rca.root_causes || []),
            JSON.stringify(rca.precision_maintenance || []), JSON.stringify(rca.human_reliability || null),
            JSON.stringify(rca.containment_actions || []), JSON.stringify(rca.lessons_learned || []), n(rca.general_moc_number), JSON.stringify(rca.additional_info || null), n(rca.file_path)
        ]);

        saveDatabase();
        console.log('✅ RCA criada:', rca.id);
        res.status(201).json({ id: rca.id, message: 'RCA criada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar RCA:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/rcas/bulk - Importação em massa
router.post('/bulk', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const rcas = req.body;

        if (!Array.isArray(rcas)) {
            return res.status(400).json({ error: 'Body must be an array' });
        }

        console.log(`🔄 Bulk Importing ${rcas.length} RCAs...`);

        db.exec('BEGIN TRANSACTION');

        const stmt = db.prepare(`
      INSERT OR REPLACE INTO rcas (
        id, version, analysis_date, analysis_duration_minutes, analysis_type, status,
        participants, facilitator, start_date, completion_date, requires_operation_support,
        failure_date, failure_time, downtime_minutes, financial_impact, os_number,
        area_id, equipment_id, subgroup_id, component_type, asset_name_display,
        specialty_id, failure_mode_id, failure_category_id,
        who, what, "when", where_description, problem_description, potential_impacts, quality_impacts,
        five_whys, five_whys_chains, ishikawa, root_causes,
        precision_maintenance, human_reliability,
        containment_actions, lessons_learned, general_moc_number, additional_info, file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        for (const rca of rcas) {
            stmt.run([
                n(rca.id), n(rca.version), n(rca.analysis_date), n(rca.analysis_duration_minutes) || 0, n(rca.analysis_type), n(rca.status),
                JSON.stringify(rca.participants || []), n(rca.facilitator), n(rca.start_date), n(rca.completion_date), rca.requires_operation_support ? 1 : 0,
                n(rca.failure_date), n(rca.failure_time), n(rca.downtime_minutes) || 0, n(rca.financial_impact) || 0, n(rca.os_number),
                n(rca.area_id), n(rca.equipment_id), n(rca.subgroup_id), n(rca.component_type), n(rca.asset_name_display),
                n(rca.specialty_id), n(rca.failure_mode_id), n(rca.failure_category_id),
                n(rca.who), n(rca.what), n(rca.when), n(rca.where_description), n(rca.problem_description), n(rca.potential_impacts), n(rca.quality_impacts),
                JSON.stringify(rca.five_whys || []), JSON.stringify(rca.five_whys_chains || []), JSON.stringify(rca.ishikawa || {}), JSON.stringify(rca.root_causes || []),
                JSON.stringify(rca.precision_maintenance || []), JSON.stringify(rca.human_reliability || null),
                JSON.stringify(rca.containment_actions || []), JSON.stringify(rca.lessons_learned || []), n(rca.general_moc_number), JSON.stringify(rca.additional_info || null), n(rca.file_path)
            ]);
        }

        stmt.free();
        db.exec('COMMIT');
        saveDatabase();

        console.log(`✅ Bulk Import Completed: ${rcas.length} records.`);
        res.json({ message: `Imported ${rcas.length} RCAs successfully` });
    } catch (error) {
        console.error('Erro no bulk import de RCAs:', error);
        res.status(500).json({ error: 'Erro interno durante importação em massa' });
    }
});

// PUT /api/rcas/:id - Atualizar análise
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const rca = req.body;

        db.run(`
      UPDATE rcas SET
        version = ?, analysis_date = ?, analysis_duration_minutes = ?, analysis_type = ?, status = ?,
        participants = ?, facilitator = ?, start_date = ?, completion_date = ?, requires_operation_support = ?,
        failure_date = ?, failure_time = ?, downtime_minutes = ?, financial_impact = ?, os_number = ?,
        area_id = ?, equipment_id = ?, subgroup_id = ?, component_type = ?, asset_name_display = ?,
        specialty_id = ?, failure_mode_id = ?, failure_category_id = ?,
        who = ?, what = ?, "when" = ?, where_description = ?, problem_description = ?, potential_impacts = ?, quality_impacts = ?,
        five_whys = ?, five_whys_chains = ?, ishikawa = ?, root_causes = ?,
        precision_maintenance = ?, human_reliability = ?,
        containment_actions = ?, lessons_learned = ?, general_moc_number = ?, additional_info = ?, file_path = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [
            n(rca.version), n(rca.analysis_date), n(rca.analysis_duration_minutes) || 0, n(rca.analysis_type), n(rca.status),
            JSON.stringify(rca.participants || []), n(rca.facilitator), n(rca.start_date), n(rca.completion_date), rca.requires_operation_support ? 1 : 0,
            n(rca.failure_date), n(rca.failure_time), n(rca.downtime_minutes) || 0, n(rca.financial_impact) || 0, n(rca.os_number),
            n(rca.area_id), n(rca.equipment_id), n(rca.subgroup_id), n(rca.component_type), n(rca.asset_name_display),
            n(rca.specialty_id), n(rca.failure_mode_id), n(rca.failure_category_id),
            n(rca.who), n(rca.what), n(rca.when), n(rca.where_description), n(rca.problem_description), n(rca.potential_impacts), n(rca.quality_impacts),
            JSON.stringify(rca.five_whys || []), JSON.stringify(rca.five_whys_chains || []), JSON.stringify(rca.ishikawa || {}), JSON.stringify(rca.root_causes || []),
            JSON.stringify(rca.precision_maintenance || []), JSON.stringify(rca.human_reliability || null),
            JSON.stringify(rca.containment_actions || []), JSON.stringify(rca.lessons_learned || []), n(rca.general_moc_number), JSON.stringify(rca.additional_info || null), n(rca.file_path),
            req.params.id
        ]);

        saveDatabase();
        res.json({ message: 'RCA atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar RCA:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/rcas/:id - Excluir análise
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        db.run('DELETE FROM rcas WHERE id = ?', [req.params.id]);
        saveDatabase();
        res.json({ message: 'RCA excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir RCA:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
