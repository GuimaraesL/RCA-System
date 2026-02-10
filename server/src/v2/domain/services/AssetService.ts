/**
 * Proposta: Serviço de domínio para gestão da árvore de ativos técnicos.
 * Fluxo: Gerencia o CRUD de ativos e provê a estrutura hierárquica (Área > Equipamento > Subgrupo).
 */

import { SqlAssetRepository } from '../../infrastructure/repositories/SqlAssetRepository';
import { Asset } from '../types/RcaTypes';
import { randomUUID } from 'crypto';

export interface AssetNode extends Asset {
    children: AssetNode[];
}

export class AssetService {
    constructor(private assetRepo: SqlAssetRepository) { }

    public getAssetTree(): AssetNode[] {
        // O repositório encapsula a lógica de reconstrução da hierarquia (buildTree)
        return this.assetRepo.findAll() as unknown as AssetNode[];
    }

    public getFlatAssets(): Asset[] {
        // Retorna a lista completa de ativos. Atualmente o findAll do repositório já orquestra a estrutura.
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
            // Normalização de nomenclatura entre formatos de payload
            parent_id: assetData.parent_id || assetData.parentId || undefined,
            children: []
        };

        this.assetRepo.create(asset);
        return asset;
    }

    public updateAsset(id: string, assetData: Partial<Asset>): void {
        const existing = this.assetRepo.findById(id);
        if (!existing) throw new Error('Ativo não encontrado');

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
            // Garante consistência de nomenclatura durante a importação em massa
            parent_id: a.parent_id || a.parentId || undefined,
            children: []
        }));
        this.assetRepo.bulkCreate(normalizedAssets);
    }

    public bulkDelete(ids: string[]): void {
        this.assetRepo.bulkDelete(ids);
    }
}