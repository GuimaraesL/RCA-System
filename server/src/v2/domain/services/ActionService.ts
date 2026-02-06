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
        // ActionService depends on RcaService for status recalculation
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
        if (!existing) throw new Error('Action not found');

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
            // updateRca handles automatic status logic
            this.rcaService.updateRca(rcaId, rca, taxonomy);
        }
    }
}
