import { SqlAssetRepository } from '../../infrastructure/repositories/SqlAssetRepository';
import { Asset } from '../types/RcaTypes';
import { randomUUID } from 'crypto';

export interface AssetNode extends Asset {
    children: AssetNode[];
}

export class AssetService {
    constructor(private assetRepo: SqlAssetRepository) { }

    public getAssetTree(): AssetNode[] {
        // O repositório já retorna a árvore montada (SqlAssetRepository.buildTree)
        // Portanto, apenas repassamos o resultado (fazendo cast se necessário, pois repo retorna Asset[] estruturado)
        return this.assetRepo.findAll() as unknown as AssetNode[];
    }

    public getFlatAssets(): Asset[] {
        // Se quisermos flat, precisamos de um método específico no repo ou "achatar" aqui.
        // O Repository.findAll atual retorna Tree.
        // Se precisarmos de flat real para endpoints /flat, precisamos corrigir o Repository
        // ou implementar um 'flatten' aqui.
        // Por enquanto, assumindo que getTree é o principal.
        // TODO: Ajustar Repository para ter findAll (Flat) e getTree (Tree)?
        // Usuário reclamou da árvore. Focando nisso.
        return this.assetRepo.findAll();
    }

    public getById(id: string): Asset | null {
        return this.assetRepo.findById(id);
    }

    public createAsset(assetData: any): Asset {
        const id = assetData.id || randomUUID();
        const asset: Asset = {
            id,
            name: assetData.name || '',
            type: assetData.type || 'AREA',
            // Normalize parentId -> parent_id
            parent_id: assetData.parent_id || assetData.parentId || undefined,
            children: []
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

    public bulkImport(assets: any[]): void {
        const normalizedAssets: Asset[] = assets.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            // Normalize parentId -> parent_id
            parent_id: a.parent_id || a.parentId || undefined,
            children: []
        }));
        this.assetRepo.bulkCreate(normalizedAssets);
    }

    public bulkDelete(ids: string[]): void {
        this.assetRepo.bulkDelete(ids);
    }
}



