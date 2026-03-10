/**
 * Proposta: Controlador HTTP para gestão de Planos de Ação (CAPA).
 * Fluxo: Recebe requisições REST e delega a lógica de persistência e recálculo de status para o ActionService.
 */
/**
 * Proposta: Controlador HTTP para gestão de Planos de Ação (CAPA).
 * Fluxo: Recebe requisições REST e delega a lógica de persistência e recálculo de status para o ActionService.
 */

import { Request, Response } from 'express';
import { ActionService } from '../../domain/services/ActionService';
import { SqlActionRepository } from '../../infrastructure/repositories/SqlActionRepository';
import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';
import { SqlTaxonomyRepository } from '../../infrastructure/repositories/SqlTaxonomyRepository';
import { NotFoundError, ValidationError } from '../../infrastructure/errors/AppError';
import { actionSchema } from '../schemas/validation';
import { z } from 'zod';

export class ActionController {
    private actionService: ActionService;

    constructor() {
        const actionRepo = new SqlActionRepository();
        const rcaRepo = new SqlRcaRepository();
        const taxonomyRepo = new SqlTaxonomyRepository();
        this.actionService = new ActionService(actionRepo, rcaRepo, taxonomyRepo);
    }

    public getAll = (req: Request, res: Response): void => {
        const rcaId = req.query.rca_id as string;
        if (rcaId) {
            const actions = this.actionService.getByRcaId(rcaId);
            res.json(actions);
        } else {
            // Caso não haja rca_id, retorna todas as ações para paridade com a versão legada
            const actionRepo = new SqlActionRepository();
            res.json(actionRepo.findAll());
        }
    };

    public create = (req: Request, res: Response): void => {
        const validation = actionSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Dados inválidos', validation.error.format());
        }

        this.actionService.createAction(validation.data as any);
        res.status(201).json({ message: 'Ação criada com sucesso' });
    };

    public update = (req: Request, res: Response): void => {
        const { id } = req.params;
        const validation = actionSchema.partial().safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Dados inválidos', validation.error.format());
        }

        this.actionService.updateAction(id, validation.data as any);
        res.json({ message: 'Ação atualizada com sucesso' });
    };

    public delete = (req: Request, res: Response): void => {
        this.actionService.deleteAction(req.params.id);
        res.json({ message: 'Ação excluída com sucesso' });
    };

    public bulkImport = (req: Request, res: Response): void => {
        const validation = z.array(actionSchema).safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError('Dados inválidos no lote de importação', validation.error.format());
        }

        this.actionService.bulkImport(validation.data as any[]);
        res.json({ message: 'Ações importadas com sucesso' });
    };

    public getById = (req: Request, res: Response): void => {
        const action = this.actionService.getById(req.params.id);
        if (!action) {
            throw new NotFoundError('Ação não encontrada');
        }
        res.json(action);
    };

    public bulkDelete = (req: Request, res: Response): void => {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            throw new ValidationError('O corpo da requisição deve conter um array de "ids"');
        }
        this.actionService.bulkDelete(ids);
        res.json({ message: `${ids.length} ações excluídas com sucesso` });
    };
}