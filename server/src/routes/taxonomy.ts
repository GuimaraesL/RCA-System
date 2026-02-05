// Rotas para Taxonomia (sql.js)
// Endpoints: GET, PUT /api/taxonomy

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/database';

const router = Router();

// Taxonomia padrão
const defaultTaxonomy = {
    // Unified Taxonomy matching storageService.ts
    analysisTypes: [
        { id: 'TYPE-01', name: 'Mini RCA' },
        { id: 'TYPE-02', name: 'RCA Completo' },
        { id: 'TYPE-03', name: 'A3 Melhoria' }
    ],
    analysisStatuses: [
        { id: 'STATUS-01', name: 'Em Aberto' },
        { id: 'STATUS-02', name: 'Em Andamento' },
        { id: 'STATUS-03', name: 'Aguardando Aprovação' },
        { id: 'STATUS-04', name: 'Cancelada' },
        { id: 'STATUS-DONE', name: 'Concluída' }
    ],
    specialties: [
        { id: 'SPEC-01', name: 'Mecânica' },
        { id: 'SPEC-02', name: 'Elétrica' },
        { id: 'SPEC-03', name: 'Instrumentação' },
        { id: 'SPEC-04', name: 'Operação' },
        { id: 'SPEC-05', name: 'Hidráulica' },
        { id: 'SPEC-06', name: 'Automação' }
    ],
    failureModes: [
        { id: 'FM-01', name: 'Desacoplado' },
        { id: 'FM-02', name: 'Curto-circuito' },
        { id: 'FM-03', name: 'Desgaste Prematuro' },
        { id: 'FM-04', name: 'Fadiga' },
        { id: 'FM-05', name: 'Sobreaquecimento' },
        { id: 'FM-06', name: 'Vibração Excessiva' },
        { id: 'FM-07', name: 'Vazamento' },
        { id: 'FM-08', name: 'Travamento' },
        { id: 'FM-09', name: 'Ruído Anormal' },
        { id: 'FM-10', name: 'Indicação Falsa' }
    ],
    failureCategories: [
        { id: 'FC-01', name: 'Erro de Montagem' },
        { id: 'FC-02', name: 'Fim de Vida Útil' },
        { id: 'FC-03', name: 'Falha Operacional' },
        { id: 'FC-04', name: 'Defeito de Fabricação' },
        { id: 'FC-05', name: 'Falta de Lubrificação' },
        { id: 'FC-06', name: 'Sobrecarga' }
    ],
    componentTypes: [
        { id: 'COMP-01', name: 'Rolamento' },
        { id: 'COMP-02', name: 'Motor' },
        { id: 'COMP-03', name: 'Bomba' },
        { id: 'COMP-04', name: 'Válvula' },
        { id: 'COMP-05', name: 'Sensor' },
        { id: 'COMP-06', name: 'Cilindro' },
        { id: 'COMP-07', name: 'Correia' },
        { id: 'COMP-08', name: 'Redutor' },
        { id: 'COMP-09', name: 'Acoplamento' },
        { id: 'COMP-10', name: 'Drive' }
    ],
    rootCauseMs: [
        { id: 'RC-01', name: 'Máquina' }, // M-01 in storage?
        { id: 'RC-02', name: 'Método' },
        { id: 'RC-03', name: 'Material' },
        { id: 'RC-04', name: 'Mão de Obra' },
        { id: 'RC-05', name: 'Meio Ambiente' },
        { id: 'RC-06', name: 'Medida' }
    ],
    triggerStatuses: [
        { id: 'TRG-ST-01', name: 'Não iniciada' },
        { id: 'TRG-ST-02', name: 'Em andamento' },
        { id: 'TRG-ST-03', name: 'Concluída' },
        { id: 'TRG-ST-04', name: 'Atrasada' },
        { id: 'TRG-ST-05', name: 'Removido' }
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
