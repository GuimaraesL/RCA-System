/**
 * Proposta: Controlador HTTP para gestão de Modos de Falha (FMEA).
 * Fluxo: Disponibiliza endpoints para consulta e manipulação de registros FMEA vinculados a ativos, delegando ao FmeaService.
 */

import { Request, Response } from 'express';
import { FmeaService } from '../../domain/services/FmeaService';
import { SqlFmeaRepository } from '../../infrastructure/repositories/SqlFmeaRepository';
import { NotFoundError, ValidationError } from '../../infrastructure/errors/AppError';

export class FmeaController {
    private fmeaService: FmeaService;

    constructor() {
        const repo = new SqlFmeaRepository();
        this.fmeaService = new FmeaService(repo);
    }

    public getByAssetId = (req: Request, res: Response): void => {
        const { assetId } = req.params;
        if (!assetId) throw new ValidationError('O parametro assetId e obrigatorio');

        res.json(this.fmeaService.getByAssetId(assetId));
    };

    public getById = (req: Request, res: Response): void => {
        const mode = this.fmeaService.getById(req.params.id);
        if (!mode) throw new NotFoundError('Modo de falha nao encontrado');

        res.json(mode);
    };

    public getAll = (req: Request, res: Response): void => {
        res.json(this.fmeaService.getAll());
    };

    public create = (req: Request, res: Response): void => {
        const mode = this.fmeaService.createMode(req.body);
        res.status(201).json(mode);
    };

    public update = (req: Request, res: Response): void => {
        const mode = this.fmeaService.updateMode(req.params.id, req.body);
        res.json(mode);
    };

    public delete = (req: Request, res: Response): void => {
        this.fmeaService.deleteMode(req.params.id);
        res.json({ message: 'Modo de falha excluido com sucesso' });
    };
}
