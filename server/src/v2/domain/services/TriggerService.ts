/**
 * Proposta: Serviço de domínio para gestão de Gatilhos (Triggers).
 * Fluxo: Gerencia o ciclo de vida dos gatilhos, provendo métodos para criação (com UUID), atualização e importação em massa.
 */

import { SqlTriggerRepository } from '../../infrastructure/repositories/SqlTriggerRepository';
import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';
import { STATUS_IDS, TRIGGER_STATUS_IDS } from '../constants';

import { Trigger } from '../types/RcaTypes';
import { randomUUID } from 'crypto';

export class TriggerService {
    private rcaRepo: SqlRcaRepository;

    constructor(
        private triggerRepo: SqlTriggerRepository,
        rcaRepo?: SqlRcaRepository
    ) { 
        this.rcaRepo = rcaRepo || new SqlRcaRepository();
    }

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
            status: triggerData.status || TRIGGER_STATUS_IDS.NEW,
        } as Trigger;

        this.triggerRepo.create(trigger);
        return trigger;
    }

    public updateTrigger(id: string, triggerData: Partial<Trigger>): void {
        const existing = this.triggerRepo.findById(id);
        if (!existing) throw new Error('Trigger not found');

        const updated = { ...existing, ...triggerData };

        // Sincronização automática de status se houver RCA vinculada (Issue #77)
        if (updated.rca_id) {
            const rca = this.rcaRepo.findById(updated.rca_id);
            if (rca) {
                if (rca.status === STATUS_IDS.CONCLUDED) {
                    updated.status = TRIGGER_STATUS_IDS.ARCHIVED;
                } else {
                    updated.status = TRIGGER_STATUS_IDS.IN_ANALYSIS;
                }
            }
        } else if (existing.rca_id && !updated.rca_id) {
            // Se o vínculo foi removido, volta para o status inicial (Novo)
            updated.status = TRIGGER_STATUS_IDS.NEW;
        }

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
