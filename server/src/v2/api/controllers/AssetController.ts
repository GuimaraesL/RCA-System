/**
 * Proposta: Controlador HTTP para gestão da árvore de Ativos Técnicos.
 * Fluxo: Disponibiliza endpoints para consulta da hierarquia (Tree) e listagem plana (Flat), além de operações CRUD delegadas ao AssetService.
 */
/**
 * Proposta: Controlador HTTP para gestão da árvore de Ativos Técnicos.
 * Fluxo: Disponibiliza endpoints para consulta da hierarquia (Tree) e listagem plana (Flat), além de operações CRUD delegadas ao AssetService.
 */

import { Request, Response } from 'express';
import { AssetService } from '../../domain/services/AssetService';
import { SqlAssetRepository } from '../../infrastructure/repositories/SqlAssetRepository';
import { NotFoundError, ValidationError } from '../../infrastructure/errors/AppError';

export class AssetController {
    private assetService: AssetService;

    constructor() {
        const repo = new SqlAssetRepository();
        this.assetService = new AssetService(repo);
    }

    public getTree = (req: Request, res: Response): void => {
        res.json(this.assetService.getAssetTree());
    };

    public getFlat = (req: Request, res: Response): void => {
        res.json(this.assetService.getFlatAssets());
    };

    public getById = (req: Request, res: Response): void => {
        const asset = this.assetService.getById(req.params.id);
        if (!asset) {
            throw new NotFoundError('Ativo não encontrado');
        }
        res.json(asset);
    };

    public create = (req: Request, res: Response): void => {
        const asset = this.assetService.createAsset(req.body);
        res.status(201).json(asset);
    };

    public update = (req: Request, res: Response): void => {
        this.assetService.updateAsset(req.params.id, req.body);
        res.json({ message: 'Ativo atualizado com sucesso' });
    };

    public delete = (req: Request, res: Response): void => {
        this.assetService.deleteAsset(req.params.id);
        res.json({ message: 'Ativo excluído com sucesso' });
    };

    public bulkImport = (req: Request, res: Response): void => {
        this.assetService.bulkImport(req.body);
        res.json({ message: 'Ativos importados com sucesso' });
    };

    public bulkDelete = (req: Request, res: Response): void => {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            throw new ValidationError('O corpo da requisição deve conter um array de "ids"');
        }
        this.assetService.bulkDelete(ids);
        res.json({ message: `${ids.length} ativos excluídos com sucesso` });
    };
}