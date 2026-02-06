import { Request, Response } from 'express';
import { TriggerService } from '../../domain/services/TriggerService';
import { SqlTriggerRepository } from '../../infrastructure/repositories/SqlTriggerRepository';

export class TriggerController {
    private triggerService: TriggerService;

    constructor() {
        const repo = new SqlTriggerRepository();
        this.triggerService = new TriggerService(repo);
    }

    public getAll = (req: Request, res: Response): void => {
        try {
            res.json(this.triggerService.getAll());
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public getById = (req: Request, res: Response): void => {
        try {
            const trigger = this.triggerService.getById(req.params.id);
            if (trigger) {
                res.json(trigger);
            } else {
                res.status(404).json({ error: 'Trigger not found' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public create = (req: Request, res: Response): void => {
        try {
            const trigger = this.triggerService.createTrigger(req.body);
            res.status(201).json(trigger);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public update = (req: Request, res: Response): void => {
        try {
            this.triggerService.updateTrigger(req.params.id, req.body);
            res.json({ message: 'Trigger updated successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public delete = (req: Request, res: Response): void => {
        try {
            this.triggerService.deleteTrigger(req.params.id);
            res.json({ message: 'Trigger deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public bulkImport = (req: Request, res: Response): void => {
        try {
            this.triggerService.bulkImport(req.body);
            res.json({ message: 'Triggers imported successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public bulkDelete = (req: Request, res: Response): void => {
        try {
            this.triggerService.bulkDelete(req.body.ids);
            res.json({ message: 'Triggers deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };
}
