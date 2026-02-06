import { Request, Response } from 'express';
import { ActionService } from '../../domain/services/ActionService';
import { SqlActionRepository } from '../../infrastructure/repositories/SqlActionRepository';
import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';
import { SqlTaxonomyRepository } from '../../infrastructure/repositories/SqlTaxonomyRepository';

export class ActionController {
    private actionService: ActionService;

    constructor() {
        const actionRepo = new SqlActionRepository();
        const rcaRepo = new SqlRcaRepository();
        const taxonomyRepo = new SqlTaxonomyRepository();
        this.actionService = new ActionService(actionRepo, rcaRepo, taxonomyRepo);
    }

    public getAll = (req: Request, res: Response): void => {
        try {
            const rcaId = req.query.rca_id as string;
            if (rcaId) {
                const actions = this.actionService.getByRcaId(rcaId);
                res.json(actions);
            } else {
                // Not ideal, but parity with V1
                const actionRepo = new SqlActionRepository();
                res.json(actionRepo.findAll());
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public create = (req: Request, res: Response): void => {
        try {
            this.actionService.createAction(req.body);
            res.status(201).json({ message: 'Action created successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public update = (req: Request, res: Response): void => {
        try {
            this.actionService.updateAction(req.params.id, req.body);
            res.json({ message: 'Action updated successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public delete = (req: Request, res: Response): void => {
        try {
            this.actionService.deleteAction(req.params.id);
            res.json({ message: 'Action deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public bulkImport = (req: Request, res: Response): void => {
        try {
            this.actionService.bulkImport(req.body);
            res.json({ message: 'Actions imported successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public getById = (req: Request, res: Response): void => {
        try {
            const action = this.actionService.getById(req.params.id);
            if (action) {
                res.json(action);
            } else {
                res.status(404).json({ error: 'Action not found' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public bulkDelete = (req: Request, res: Response): void => {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids)) {
                res.status(400).json({ error: 'Body must contain "ids" array' });
                return;
            }
            this.actionService.bulkDelete(ids);
            res.json({ message: `Deleted ${ids.length} actions successfully` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}
