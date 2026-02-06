import { SqlAssetRepository } from '../../infrastructure/repositories/SqlAssetRepository';
import { Asset } from '../types/RcaTypes';
import { randomUUID } from 'crypto';

export interface AssetNode extends Asset {
    children: AssetNode[];
}

export class AssetService {
    constructor(private assetRepo: SqlAssetRepository) { }

    public getAssetTree(): AssetNode[] {
        const flatAssets = this.assetRepo.findAll();
        return this.buildTree(flatAssets);
    }

    public getFlatAssets(): Asset[] {
        return this.assetRepo.findAll();
    }

    public getById(id: string): Asset | null {
        return this.assetRepo.findById(id);
    }

    public createAsset(assetData: Partial<Asset>): Asset {
        const id = assetData.id || randomUUID();
        const asset: Asset = {
            id,
            name: assetData.name || '',
            type: assetData.type || 'AREA',
            parent_id: assetData.parent_id || undefined
        };

        this.assetRepo.create(asset);
        return asset;
    }

    public updateAsset(id: string, assetData: Partial<Asset>): void {
        const existing = this.assetRepo.findById(id);
        if (!existing) throw new Error('Asset not found');

        const updated = { ...existing, ...assetData };
        this.assetRepo.update(updated);
    }

    public deleteAsset(id: string): void {
        this.assetRepo.delete(id);
    }

    public bulkImport(assets: Asset[]): void {
        this.assetRepo.bulkCreate(assets);
    }

    public bulkDelete(ids: string[]): void {
        this.assetRepo.bulkDelete(ids);
    }

    private buildTree(flatAssets: Asset[]): AssetNode[] {
        const assetMap = new Map<string, AssetNode>();
        const roots: AssetNode[] = [];

        flatAssets.forEach(asset => {
            assetMap.set(asset.id, { ...asset, children: [] });
        });

        flatAssets.forEach(asset => {
            const node = assetMap.get(asset.id)!;
            if (asset.parent_id && assetMap.has(asset.parent_id)) {
                assetMap.get(asset.parent_id)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }
}
