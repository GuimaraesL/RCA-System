/**
 * Proposta: Serviço de domínio para gestão do ciclo de vida de análises RCA.
 * Fluxo: Recebe dados brutos, normaliza estruturas complexas e orquestra o cálculo automático de status.
 */

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

    // --- Métodos Públicos de Negócio ---

    public getAllRcas(page: number = 1, limit: number = 50) {
        return this.rcaRepo.findAllPaginated(page, limit);
    }

    public createRca(data: Partial<Rca>, taxonomy: TaxonomyConfig): { rca: Rca, statusReason: string } {
        // 1. Preparação dos dados
        const id = (data.id && data.id.trim()) ? data.id : randomUUID();
        let rca: Rca = { ...data, id } as Rca;

        // 2. Migração e Normalização
        rca = this.migrateRcaData(rca);

        // 3. Cálculo de Status
        // Uma nova RCA geralmente não possui ações, mas verificamos caso o ID tenha sido fornecido
        const actions = this.actionRepo.findByRcaId(id);
        const statusResult = this.calculateRcaStatus(rca, actions, taxonomy);

        rca.status = statusResult.newStatus;
        if (statusResult.completionDate) {
            rca.completion_date = statusResult.completionDate;
        }

        // 4. Persistência
        this.rcaRepo.create(rca);

        return { rca, statusReason: statusResult.reason };
    }

    public updateRca(id: string, data: any, taxonomy: TaxonomyConfig): { rca: Rca, statusChanged: boolean, statusReason: string } {
        // 1. Preparação dos dados
        let rca: Rca = { ...data, id };

        // 2. Migração e Normalização
        rca = this.migrateRcaData(rca);

        // 3. Cálculo de Status
        const actions = this.actionRepo.findByRcaId(id);
        const statusResult = this.calculateRcaStatus(rca, actions, taxonomy);

        // 4. Aplicação da Lógica de Status
        if (statusResult.statusChanged) {
            rca.status = statusResult.newStatus;
        }
        if (statusResult.completionDate && !rca.completion_date) {
            rca.completion_date = statusResult.completionDate;
        }

        // 5. Atualização
        this.rcaRepo.update(rca);

        return {
            rca,
            statusChanged: statusResult.statusChanged,
            statusReason: statusResult.reason
        };
    }

    public deleteRca(id: string): boolean {
        const exists = this.rcaRepo.findById(id);
        if (!exists) return false;

        this.rcaRepo.delete(id);
        return true;
    }

    public bulkDeleteRca(ids: string[]): void {
        this.rcaRepo.bulkDelete(ids);
    }

    public bulkImport(data: any[], taxonomy: TaxonomyConfig, providedActions: Action[] = []): { count: number } {
        const processed = data.map(item => {
            // 1. Preparação dos dados
            const id = (item.id && item.id.trim()) ? item.id : randomUUID();
            let rca: Rca = { ...item, id };

            // 2. Migração e Normalização
            rca = this.migrateRcaData(rca);

            // 3. Cálculo de Status
            // Prioriza ações fornecidas no lote (ex: restauração de backup completo),
            // caso contrário, busca no banco de dados.
            let rcaActions = providedActions.filter(a => a.rca_id?.trim().toLowerCase() === rca.id?.trim().toLowerCase());
            if (rcaActions.length === 0 && providedActions.length === 0) {
                rcaActions = this.actionRepo.findByRcaId(rca.id);
            }
            
            const statusResult = this.calculateRcaStatus(rca, rcaActions, taxonomy);

            rca.status = statusResult.newStatus;
            if (statusResult.completionDate && !rca.completion_date) {
                rca.completion_date = statusResult.completionDate;
            }

            return rca;
        });

        // 4. Persistência em massa via transação
        this.rcaRepo.bulkCreate(processed);

        return { count: processed.length };
    }

    // --- Lógica de Domínio ---

    public migrateRcaData(rca: any): Rca {
        const migrated = { ...rca };

        // 1. Garantir integridade de root_causes
        if (!migrated.root_causes) migrated.root_causes = [];
        if (migrated.root_cause && migrated.root_cause_m_id) {
            migrated.root_causes.push({
                id: `RC-${Date.now()}`,
                cause: migrated.root_cause,
                root_cause_m_id: migrated.root_cause_m_id
            });
        }

        // 2. Normalização de Participantes
        if (typeof migrated.participants === 'string') {
            migrated.participants = migrated.participants.split(',').map((p: string) => p.trim()).filter((p: string) => p);
        }
        if (!Array.isArray(migrated.participants)) migrated.participants = [];

        // 3. Inicialização de 5 Porquês (Modo Linear)
        if (!migrated.five_whys || !Array.isArray(migrated.five_whys)) {
            migrated.five_whys = [
                { id: '1', why_question: '', answer: '' },
                { id: '2', why_question: '', answer: '' },
                { id: '3', why_question: '', answer: '' },
                { id: '4', why_question: '', answer: '' },
                { id: '5', why_question: '', answer: '' }
            ];
        }

        // 4. Garantir estruturas básicas para evitar erros de renderização
        if (!migrated.five_whys_chains) migrated.five_whys_chains = [];
        if (!migrated.ishikawa) migrated.ishikawa = { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] };
        if (!migrated.human_reliability) migrated.human_reliability = { questions: [], conclusions: [], validation: { isValidated: '', comment: '' } };

        return migrated as Rca;
    }

    private isAutoManagedStatus(status: string | undefined, taxonomy: TaxonomyConfig): boolean {
        // Resolução de IDs de status via taxonomia para evitar dependência de nomes
        const doneItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.CONCLUDED);
        const waitingItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.WAITING_VERIFICATION);
        const openItem = taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.IN_PROGRESS);

        const doneStatusId = doneItem?.id || STATUS_IDS.CONCLUDED;
        const waitingStatusId = waitingItem?.id || STATUS_IDS.WAITING_VERIFICATION;
        const openStatusId = openItem?.id || STATUS_IDS.IN_PROGRESS;

        const autoManagedStatuses: (string | null | undefined)[] = [openStatusId, waitingStatusId, doneStatusId, '', undefined, null];
        return autoManagedStatuses.includes(status);
    }

    private validateMandatoryFields(rca: any, actions: Action[], taxonomy: TaxonomyConfig): { valid: boolean, missing: string[] } {
        const mandatoryList = taxonomy.mandatoryFields?.rca?.conclude || [];

        const missing: string[] = [];
        for (const field of mandatoryList) {
            let valid = true;
            
            if (field === 'actions') {
                valid = actions.length > 0;
            } else {
                const value = rca[field];
                if (field === 'participants') {
                    valid = Array.isArray(value) && value.length > 0 && !(value.length === 1 && value[0] === '');
                } else if (field === 'root_causes') {
                    valid = Array.isArray(value) && value.length > 0 && value.every((rc: any) => rc.root_cause_m_id && rc.cause?.trim());
                } else if (field === 'five_whys') {
                    // Contabiliza respostas tanto do modo linear quanto do avançado (hierárquico)
                    const linearCount = Array.isArray(rca.five_whys) ? rca.five_whys.filter((w: any) => w.answer?.trim()).length : 0;
                    let advancedCount = 0;
                    if (Array.isArray(rca.five_whys_chains)) {
                        const countNodeAnswers = (node: any): number => {
                            let count = Array.isArray(node.whys) ? node.whys.filter((w: any) => w.answer?.trim()).length : 0;
                            if (Array.isArray(node.children)) {
                                node.children.forEach((child: any) => { count += countNodeAnswers(child); });
                            }
                            return count;
                        };
                        rca.five_whys_chains.forEach((chain: any) => {
                            if (chain.root_node) advancedCount += countNodeAnswers(chain.root_node);
                        });
                    }
                    valid = (linearCount + advancedCount) >= 3;
                } else if (field === 'ishikawa') {
                    valid = value && Object.values(value).some((arr: any) => Array.isArray(arr) && arr.length > 0);
                } else if (['downtime_minutes', 'financial_impact'].includes(field)) {
                    valid = value !== undefined && value !== null;
                } else {
                    if (!value) valid = false;
                    if (typeof value === 'string' && value.trim().length === 0) valid = false;
                }
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
            return { newStatus: currentStatus || openStatusId, statusChanged: false, reason: 'Status protegido' };
        }

        const { valid: isMandatoryComplete, missing } = this.validateMandatoryFields(rca, actions, taxonomy);
        const rcaActions = actions.filter(a => a.rca_id?.trim().toLowerCase() === rca.id?.trim().toLowerCase());
        const hasMainActions = rcaActions.length > 0;
        const allActionsEffective = hasMainActions && rcaActions.every(a => ['3', '4'].includes(String(a.status)));
        const isActionsMandatory = taxonomy.mandatoryFields?.rca?.conclude?.includes('actions');

        let newStatus = currentStatus;
        let reason = '';

        if (!isMandatoryComplete) {
            newStatus = openStatusId;
            reason = `Campos ausentes: ${missing.join(', ')}`;
        } else {
            // Todos os campos obrigatórios estão presentes.
            // Decide entre Concluída ou Aguardando Verificação.
            if (hasMainActions && isActionsMandatory && !allActionsEffective) {
                newStatus = waitingStatusId;
                reason = 'Aguardando verificação de eficácia das ações obrigatórias';
            } else {
                newStatus = doneStatusId;
                reason = hasMainActions 
                    ? (allActionsEffective ? 'Completo, ações efetivas' : 'Completo, eficácia das ações ignorada pela config') 
                    : 'Completo, sem ações necessárias';
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