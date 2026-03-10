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
import { NotFoundError, ValidationError } from '../../infrastructure/errors/AppError';
import { z } from 'zod';

export class TriggerController {
    private triggerService: TriggerService;

    constructor() {
        const repo = new SqlTriggerRepository();
        this.triggerService = new TriggerService(repo);
    }

    public getAll = (req: Request, res: Response): void => {
        res.json(this.triggerService.getAll());
    };

    public getById = (req: Request, res: Response): void => {
        const trigger = this.triggerService.getById(req.params.id);
        if (!trigger) {
            throw new NotFoundError('Gatilho não encontrado');
        }
        res.json(trigger);
    };

    public create = (req: Request, res: Response): void => {
        // Validação de dados de entrada com Zod
        const validation = triggerSchema.safeParse(req.body);

        if (!validation.success) {
            throw new ValidationError('Dados inválidos', validation.error.format());
        }

        const trigger = this.triggerService.createTrigger(validation.data as any);
        res.status(201).json(trigger);
    };

    public update = (req: Request, res: Response): void => {
        // Validação parcial para atualização
        const validation = triggerSchema.partial().safeParse(req.body);

        if (!validation.success) {
            throw new ValidationError('Dados inválidos', validation.error.format());
        }

        this.triggerService.updateTrigger(req.params.id, validation.data as any);
        res.json({ message: 'Gatilho atualizado com sucesso' });
    };

    public delete = (req: Request, res: Response): void => {
        this.triggerService.deleteTrigger(req.params.id);
        res.json({ message: 'Gatilho excluído com sucesso' });
    };

    public bulkImport = (req: Request, res: Response): void => {
        const validation = z.array(triggerSchema).safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Dados inválidos no lote de importação', validation.error.format());
        }

        this.triggerService.bulkImport(validation.data as any[]);
        res.json({ message: 'Gatilhos importados com sucesso' });
    };

    public bulkDelete = (req: Request, res: Response): void => {
        this.triggerService.bulkDelete(req.body.ids);
        res.json({ message: 'Gatilhos excluídos com sucesso' });
    };
}