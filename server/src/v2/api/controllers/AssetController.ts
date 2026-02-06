import { Request, Response } from 'express';
import { AssetService } from '../../domain/services/AssetService';
import { SqlAssetRepository } from '../../infrastructure/repositories/SqlAssetRepository';

export class AssetController {
    private assetService: AssetService;

    constructor() {
        const repo = new SqlAssetRepository();
        this.assetService = new AssetService(repo);
    }

    public getTree = (req: Request, res: Response): void => {
        try {
            res.json(this.assetService.getAssetTree());
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public getFlat = (req: Request, res: Response): void => {
        try {
            res.json(this.assetService.getFlatAssets());
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public getById = (req: Request, res: Response): void => {
        try {
            const asset = this.assetService.getById(req.params.id);
            if (asset) {
                res.json(asset);
            } else {
                res.status(404).json({ error: 'Asset not found' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    public create = (req: Request, res: Response): void => {
        try {
            const asset = this.assetService.createAsset(req.body);
            res.status(201).json(asset);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public update = (req: Request, res: Response): void => {
        try {
            this.assetService.updateAsset(req.params.id, req.body);
            res.json({ message: 'Asset updated successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public delete = (req: Request, res: Response): void => {
        try {
            this.assetService.deleteAsset(req.params.id);
            res.json({ message: 'Asset deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public bulkImport = (req: Request, res: Response): void => {
        try {
            this.assetService.bulkImport(req.body);
            res.json({ message: 'Assets imported successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    public bulkDelete = (req: Request, res: Response): void => {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids)) {
                res.status(400).json({ error: 'Body must contain "ids" array' });
                return;
            }
            this.assetService.bulkDelete(ids);
            res.json({ message: `Deleted ${ids.length} assets successfully` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}
