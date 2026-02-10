import { Rca, Action, TaxonomyConfig } from '../types/RcaTypes';
import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../../infrastructure/repositories/SqlActionRepository';
import { randomUUID } from 'crypto';
import { STATUS_IDS } from '../constants';

export class RcaService {
    private rcaRepo: SqlRcaRepository;
    private actionRepo: SqlActionRepository;

    constructor(
        rcaRepo?: SqlRcaRepository,
        actionRepo?: SqlActionRepository
    ) {
        this.rcaRepo = rcaRepo || new SqlRcaRepository();
        this.actionRepo = actionRepo || new SqlActionRepository();
    }

    // --- Public Business Methods ---

    public getAllRcas(page: number = 1, limit: number = 50) {
        return this.rcaRepo.findAllPaginated(page, limit);
    }

    public createRca(data: Partial<Rca>, taxonomy: TaxonomyConfig): { rca: Rca, statusReason: string } {
        // 1. Prepare data
        const id = (data.id && data.id.trim()) ? data.id : randomUUID();
        let rca: Rca = { ...data, id } as Rca;

        // 2. Migrate/Normalize
        rca = this.migrateRcaData(rca);

        // 3. Calculate Status
        // New RCA has no actions usually, but we check anyway if ID was provided
        const actions = this.actionRepo.findByRcaId(id);
        const statusResult = this.calculateRcaStatus(rca, actions, taxonomy);

        rca.status = statusResult.newStatus;
        if (statusResult.completionDate) {
            rca.completion_date = statusResult.completionDate;
        }

        // 4. Save
        this.rcaRepo.create(rca);

        return { rca, statusReason: statusResult.reason };
    }

    public updateRca(id: string, data: any, taxonomy: TaxonomyConfig): { rca: Rca, statusChanged: boolean, statusReason: string } {
        // 1. Prepare data
        let rca: Rca = { ...data, id };

        // 2. Migrate/Normalize
        rca = this.migrateRcaData(rca);

        // 3. Calculate Status
        const actions = this.actionRepo.findByRcaId(id);
        const statusResult = this.calculateRcaStatus(rca, actions, taxonomy);

        // 4. Apply Status Logic
        if (statusResult.statusChanged) {
            rca.status = statusResult.newStatus;
        }
        if (statusResult.completionDate && !rca.completion_date) {
            rca.completion_date = statusResult.completionDate;
        }

        // 5. Update
        this.rcaRepo.update(rca);

        return {
            rca,
            statusChanged: statusResult.statusChanged,
            statusReason: statusResult.reason
        };
    }

    public deleteRca(id: string): boolean {
        // We could verify existence first, but repository delete is idempotent-ish
        const exists = this.rcaRepo.findById(id);
        if (!exists) return false;

        this.rcaRepo.delete(id);
        return true;
    }

    public bulkDeleteRca(ids: string[]): void {
        this.rcaRepo.bulkDelete(ids);
    }

    // --- Domain Logic (Ported from rcaStatusService.ts) ---

    // Copied exact logic from migration part
    public migrateRcaData(rca: any): Rca {
        const migrated = { ...rca };

        // 1. Ensure root_causes
        if (!migrated.root_causes) migrated.root_causes = [];
        if (migrated.root_cause && migrated.root_cause_m_id) {
            migrated.root_causes.push({
                id: `RC-${Date.now()}`,
                cause: migrated.root_cause,
                root_cause_m_id: migrated.root_cause_m_id
            });
        }

        // 2. Participants
        if (typeof migrated.participants === 'string') {
            migrated.participants = migrated.participants.split(',').map((p: string) => p.trim()).filter((p: string) => p);
        }
        if (!Array.isArray(migrated.participants)) migrated.participants = [];

        // 3. Five Whys
        if (!migrated.five_whys || !Array.isArray(migrated.five_whys)) {
            migrated.five_whys = [
                { id: '1', why_question: '', answer: '' },
                { id: '2', why_question: '', answer: '' },
                { id: '3', why_question: '', answer: '' },
                { id: '4', why_question: '', answer: '' },
                { id: '5', why_question: '', answer: '' }
            ];
        }

        // 4. Others
        if (!migrated.five_whys_chains) migrated.five_whys_chains = [];
        if (!migrated.ishikawa) migrated.ishikawa = { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] };
        if (!migrated.human_reliability) migrated.human_reliability = { questions: [], conclusions: [], validation: { isValidated: '', comment: '' } };

        return migrated as Rca;
    }

    private isAutoManagedStatus(status: string | undefined, taxonomy: TaxonomyConfig): boolean {
        // Status resolution logic
        // FIX: Use ID mapping instead of Name
        const doneItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.CONCLUDED);
        const waitingItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.WAITING_VERIFICATION);
        const openItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.IN_PROGRESS);

        const doneStatusId = doneItem?.id || STATUS_IDS.CONCLUDED;
        const waitingStatusId = waitingItem?.id || STATUS_IDS.WAITING_VERIFICATION;
        const openStatusId = openItem?.id || STATUS_IDS.IN_PROGRESS;

        const autoManagedStatuses: (string | null | undefined)[] = [openStatusId, waitingStatusId, doneStatusId, '', undefined, null];
        return autoManagedStatuses.includes(status);
    }

    private validateMandatoryFields(rca: any, taxonomy: TaxonomyConfig): { valid: boolean, missing: string[] } {
        const DEFAULT_CONCLUDE = ['analysis_type', 'what', 'problem_description', 'subgroup_id', 'who', 'when', 'where_description', 'specialty_id', 'failure_mode_id', 'failure_category_id', 'component_type', 'participants', 'root_causes', 'downtime_minutes'];
        const mandatoryList = taxonomy.mandatoryFields?.rca?.conclude || DEFAULT_CONCLUDE;

        const missing: string[] = [];
        for (const field of mandatoryList) {
            const value = rca[field];
            // validation logic
            let valid = true;
            if (['participants', 'root_causes', 'five_whys'].includes(field)) {
                valid = Array.isArray(value) && value.length > 0;
            } else if (field === 'ishikawa') {
                valid = value !== null && value !== undefined;
            } else if (['downtime_minutes', 'financial_impact'].includes(field)) {
                valid = value !== undefined && value !== null;
            } else {
                if (!value) valid = false;
                if (typeof value === 'string' && value.trim().length === 0) valid = false;
            }
            if (!valid) missing.push(field);
        }
        return { valid: missing.length === 0, missing };
    }

    public calculateRcaStatus(rca: Rca, actions: Action[], taxonomy: TaxonomyConfig): { newStatus: string, statusChanged: boolean, completionDate?: string, reason: string } {
        const doneItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.CONCLUDED);
        const waitingItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.WAITING_VERIFICATION);
        const openItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.IN_PROGRESS);

        const doneStatusId = doneItem?.id || STATUS_IDS.CONCLUDED;
        const waitingStatusId = waitingItem?.id || STATUS_IDS.WAITING_VERIFICATION;
        const openStatusId = openItem?.id || STATUS_IDS.IN_PROGRESS;

        const currentStatus = rca.status;

        if (!this.isAutoManagedStatus(currentStatus, taxonomy)) {
            return { newStatus: currentStatus || openStatusId, statusChanged: false, reason: 'Protected status' };
        }

        const { valid: isMandatoryComplete, missing } = this.validateMandatoryFields(rca, taxonomy);
        const rcaActions = actions.filter(a => a.rca_id === rca.id);
        const hasMainActions = rcaActions.length > 0;
        const allActionsEffective = hasMainActions && rcaActions.every(a => ['3', '4'].includes(String(a.status)));

        let newStatus = currentStatus;
        let reason = '';

        if (!isMandatoryComplete) {
            newStatus = openStatusId;
            reason = `Missing: ${missing.join(', ')}`;
        } else {
            if (!hasMainActions) {
                newStatus = doneStatusId;
                reason = 'Complete, no actions';
            } else if (allActionsEffective) {
                newStatus = doneStatusId;
                reason = 'Complete, actions effective';
            } else {
                newStatus = waitingStatusId;
                reason = 'Pending verification';
            }
        }

        let completionDate: string | undefined;
        if (newStatus === doneStatusId && !rca.completion_date) {
            completionDate = new Date().toISOString().split('T')[0];
        }

        return {
            newStatus: newStatus || openStatusId,
            statusChanged: newStatus !== currentStatus,
            completionDate,
            reason
        };
    }
}
