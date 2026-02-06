import { SqlTriggerRepository } from '../../infrastructure/repositories/SqlTriggerRepository';
import { Trigger } from '../types/RcaTypes';
import { randomUUID } from 'crypto';

export class TriggerService {
    constructor(private triggerRepo: SqlTriggerRepository) { }

    public getAll(): Trigger[] {
        return this.triggerRepo.findAll();
    }

    public getById(id: string): Trigger | null {
        return this.triggerRepo.findById(id);
    }

    public createTrigger(triggerData: Partial<Trigger>): Trigger {
        const id = triggerData.id || randomUUID();
        const trigger: Trigger = {
            ...triggerData,
            id,
            start_date: triggerData.start_date || new Date().toISOString(),
            status: triggerData.status || 'STATUS-01',
        } as Trigger;

        this.triggerRepo.create(trigger);
        return trigger;
    }

    public updateTrigger(id: string, triggerData: Partial<Trigger>): void {
        const existing = this.triggerRepo.findById(id);
        if (!existing) throw new Error('Trigger not found');

        const updated = { ...existing, ...triggerData };
        this.triggerRepo.update(updated);
    }

    public deleteTrigger(id: string): void {
        this.triggerRepo.delete(id);
    }

    public bulkImport(triggers: Trigger[]): void {
        this.triggerRepo.bulkCreate(triggers);
    }

    public bulkDelete(ids: string[]): void {
        this.triggerRepo.bulkDelete(ids);
    }
}
