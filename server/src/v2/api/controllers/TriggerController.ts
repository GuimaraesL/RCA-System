/**
 * Proposta: Controlador HTTP para gestão de Gatilhos (Triggers) de parada.
 * Fluxo: Disponibiliza endpoints CRUD para manipulação de gatilhos, delegando a lógica de negócio e persistência ao TriggerService.
 */
/**
 * Proposta: Controlador HTTP para gestão de Gatilhos (Triggers) de parada.
 * Fluxo: Disponibiliza endpoints CRUD para manipulação de gatilhos, delegando a lógica de negócio e persistência ao TriggerService.
 */

import { Request, Response } from 'express';
import { TriggerService } from '../../domain/services/TriggerService';
import { SqlTriggerRepository } from '../../infrastructure/repositories/SqlTriggerRepository';
import { triggerSchema } from '../schemas/validation';

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
                res.status(404).json({ error: 'Gatilho não encontrado' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public create = (req: Request, res: Response): void => {
        try {
            // Validação de dados de entrada com Zod
            const validation = triggerSchema.safeParse(req.body);
            
            if (!validation.success) {
                res.status(400).json({ 
                    error: 'Dados inválidos', 
                    details: validation.error.format() 
                });
                return;
            }

            const trigger = this.triggerService.createTrigger(req.body);
            res.status(201).json(trigger);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public update = (req: Request, res: Response): void => {
        try {
            // Validação parcial para atualização
            const validation = triggerSchema.partial().safeParse(req.body);

            if (!validation.success) {
                res.status(400).json({ 
                    error: 'Dados inválidos', 
                    details: validation.error.format() 
                });
                return;
            }

            this.triggerService.updateTrigger(req.params.id, req.body);
            res.json({ message: 'Gatilho atualizado com sucesso' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public delete = (req: Request, res: Response): void => {
        try {
            this.triggerService.deleteTrigger(req.params.id);
            res.json({ message: 'Gatilho excluído com sucesso' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public bulkImport = (req: Request, res: Response): void => {
        try {
            this.triggerService.bulkImport(req.body);
            res.json({ message: 'Gatilhos importados com sucesso' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public bulkDelete = (req: Request, res: Response): void => {
        try {
            this.triggerService.bulkDelete(req.body.ids);
            res.json({ message: 'Gatilhos excluídos com sucesso' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };
}