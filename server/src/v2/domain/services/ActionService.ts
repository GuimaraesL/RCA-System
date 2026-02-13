/**
 * Proposta: Serviço de domínio para gestão de Planos de Ação (CAPA).
 * Fluxo: Gerencia o CRUD de ações e dispara o recálculo de status da RCA vinculada sempre que há alterações.
 */

import { SqlActionRepository } from '../../infrastructure/repositories/SqlActionRepository';
import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';
import { SqlTaxonomyRepository } from '../../infrastructure/repositories/SqlTaxonomyRepository';
import { RcaService } from './RcaService';
import { Action } from '../types/RcaTypes';

export class ActionService {
    private actionRepo: SqlActionRepository;
    private rcaService: RcaService;
    private taxonomyRepo: SqlTaxonomyRepository;

    constructor(
        actionRepo: SqlActionRepository,
        rcaRepo: SqlRcaRepository,
        taxonomyRepo: SqlTaxonomyRepository
    ) {
        this.actionRepo = actionRepo;
        this.taxonomyRepo = taxonomyRepo;
        // ActionService depende do RcaService para o recálculo automático de status
        this.rcaService = new RcaService(rcaRepo, actionRepo);
    }

    public getByRcaId(rcaId: string): Action[] {
        return this.actionRepo.findByRcaId(rcaId);
    }

    public createAction(action: Action): void {
        this.actionRepo.create(action);
        this.triggerRcaRecalculation(action.rca_id);
    }

    public updateAction(id: string, actionData: Partial<Action>): void {
        const existing = this.actionRepo.findById(id);
        if (!existing) throw new Error('Ação não encontrada');

        const updated = { ...existing, ...actionData };
        this.actionRepo.update(updated);

        if (updated.rca_id) {
            this.triggerRcaRecalculation(updated.rca_id);
        }
    }

    public deleteAction(id: string): void {
        const existing = this.actionRepo.findById(id);
        if (!existing) return;

        this.actionRepo.delete(id);
        this.triggerRcaRecalculation(existing.rca_id);
    }

    public bulkImport(actions: Action[]): void {
        this.actionRepo.bulkCreate(actions);

        // Identifica IDs únicos de RCAs afetadas para disparar o recálculo de status
        const affectedRcaIds = Array.from(new Set(
            actions.map(a => a.rca_id).filter(id => id && id.trim().length > 0)
        ));

        console.log(`[ActionService] 🔄 Disparando recálculo para ${affectedRcaIds.length} RCAs após importação em massa.`);
        
        for (const rcaId of affectedRcaIds) {
            try {
                this.triggerRcaRecalculation(rcaId);
            } catch (error) {
                console.warn(`[ActionService] ⚠️ Falha ao recalcular status da RCA ${rcaId}:`, error);
            }
        }
    }

    public getById(id: string): Action | null {
        return this.actionRepo.findById(id);
    }

    public bulkDelete(ids: string[]): void {
        this.actionRepo.bulkDelete(ids);
    }

    private triggerRcaRecalculation(rcaId: string): void {
        const taxonomy = this.taxonomyRepo.getTaxonomy();
        const rca = this.rcaService['rcaRepo'].findById(rcaId);

        if (rca) {
            // O método updateRca do serviço orquestra a lógica automática de status
            this.rcaService.updateRca(rcaId, rca, taxonomy);
        }
    }
}