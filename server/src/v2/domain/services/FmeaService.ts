/**
 * Proposta: Serviço de domínio para gestão de Modos de Falha (FMEA).
 * Fluxo: Orquestra validações de negócio e delega persistência ao repositório, garantindo que o RPN seja calculado corretamente.
 */

import { SqlFmeaRepository } from '../../infrastructure/repositories/SqlFmeaRepository';
import { FmeaMode } from '../types/RcaTypes';
import { randomUUID } from 'crypto';

export class FmeaService {
    constructor(private fmeaRepo: SqlFmeaRepository) { }

    public getByAssetId(assetId: string): FmeaMode[] {
        return this.fmeaRepo.findByAssetId(assetId);
    }

    public getById(id: string): FmeaMode | null {
        return this.fmeaRepo.findById(id);
    }

    public getAll(): FmeaMode[] {
        return this.fmeaRepo.findAll();
    }

    public createMode(data: Partial<FmeaMode>): FmeaMode {
        if (!data.asset_id || !data.failure_mode) {
            throw new Error('Os campos asset_id e failure_mode são obrigatórios');
        }

        const mode: FmeaMode = {
            id: data.id || randomUUID(),
            asset_id: data.asset_id,
            failure_mode: data.failure_mode,
            potential_effects: data.potential_effects,
            severity: data.severity ?? 1,
            potential_causes: data.potential_causes,
            occurrence: data.occurrence ?? 1,
            current_controls: data.current_controls,
            detection: data.detection ?? 1,
            recommended_actions: data.recommended_actions
        };

        this.fmeaRepo.create(mode);

        // O RPN é calculado pelo banco (GENERATED ALWAYS AS), então relemos o registro
        return this.fmeaRepo.findById(mode.id) ?? mode;
    }

    public updateMode(id: string, data: Partial<FmeaMode>): FmeaMode {
        const existing = this.fmeaRepo.findById(id);
        if (!existing) throw new Error('Modo de falha não encontrado');

        const updated: FmeaMode = { ...existing, ...data, id };
        this.fmeaRepo.update(updated);

        return this.fmeaRepo.findById(id) ?? updated;
    }

    public deleteMode(id: string): void {
        this.fmeaRepo.delete(id);
    }

    public deleteByAssetId(assetId: string): void {
        this.fmeaRepo.deleteByAssetId(assetId);
    }
}
