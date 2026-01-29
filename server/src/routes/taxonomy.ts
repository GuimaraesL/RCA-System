// Rotas para Taxonomia (sql.js)
// Endpoints: GET, PUT /api/taxonomy

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/database';

const router = Router();

// Taxonomia padrão
const defaultTaxonomy = {
    analysisTypes: [
        { id: 'AT-01', name: 'Mini RCA' },
        { id: 'AT-02', name: 'RCA Completo' },
        { id: 'AT-03', name: 'A3 Melhoria' }
    ],
    analysisStatuses: [
        { id: 'STATUS-01', name: 'Em Andamento' }, // Unified (was Aberto + Andamento)
        { id: 'STATUS-WAITING', name: 'Aguardando Verificação' }, // NEW: Validation Checkpoint
        { id: 'STATUS-03', name: 'Concluída' }
    ],
    specialties: [
        { id: 'SPEC-01', name: 'Mecânica' },
        { id: 'SPEC-02', name: 'Elétrica' },
        { id: 'SPEC-03', name: 'Automação' }
    ],
    failureModes: [
        { id: 'FM-01', name: 'Quebra', specialty_ids: ['SPEC-01'] }, // Mecânica Only
        { id: 'FM-02', name: 'Desgaste', specialty_ids: ['SPEC-01'] }, // Mecânica Only
        { id: 'FM-03', name: 'Falha Operacional' } // Shared (None = All)
    ],
    failureCategories: [
        { id: 'FC-01', name: 'Mecânica' },
        { id: 'FC-02', name: 'Elétrica' },
        { id: 'FC-03', name: 'Processo' }
    ],
    componentTypes: [
        { id: 'CT-01', name: 'Motor' },
        { id: 'CT-02', name: 'Bomba' },
        { id: 'CT-03', name: 'Rolamento' }
    ],
    rootCauseMs: [
        { id: 'RC-01', name: 'Máquina' },
        { id: 'RC-02', name: 'Método' },
        { id: 'RC-03', name: 'Material' },
        { id: 'RC-04', name: 'Mão de Obra' },
        { id: 'RC-05', name: 'Meio Ambiente' },
        { id: 'RC-06', name: 'Medida' }
    ],
    triggerStatuses: [
        { id: 'TS-01', name: 'Novo' },
        { id: 'TS-02', name: 'Em andamento' },
        { id: 'TS-03', name: 'Análise' },
        { id: 'TS-04', name: 'Concluído' }
    ],
    mandatoryFields: {
        trigger: {
            save: ['area_id', 'equipment_id', 'subgroup_id', 'start_date', 'end_date', 'stop_type', 'stop_reason', 'analysis_type_id', 'responsible']
        },
        rca: {
            create: ['subgroup_id', 'failure_date', 'analysis_type', 'what'],
            conclude: ['root_causes', 'five_whys', 'ishikawa']
        }
    }
};

// GET /api/taxonomy
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const result = db.exec('SELECT config FROM taxonomy LIMIT 1');

        if (result.length > 0 && result[0].values.length > 0) {
            res.json(JSON.parse(result[0].values[0][0] as string));
        } else {
            res.json(defaultTaxonomy);
        }
    } catch (error) {
        console.error('Erro ao buscar taxonomy:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/taxonomy
router.put('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        db.run('DELETE FROM taxonomy');
        db.run('INSERT INTO taxonomy (config) VALUES (?)', [JSON.stringify(req.body)]);
        saveDatabase();
        res.json({ message: 'Taxonomia atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar taxonomy:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
