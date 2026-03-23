/**
 * Proposta: Serviço de domínio para gestão do ciclo de vida de análises RCA.
 * Fluxo: Recebe dados brutos, normaliza estruturas complexas e orquestra o cálculo automático de status.
 */

import { Rca, Action, TaxonomyConfig, Asset } from '../types/RcaTypes';
import { SqlRcaRepository } from '../../infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../../infrastructure/repositories/SqlActionRepository';
import { SqlTriggerRepository } from '../../infrastructure/repositories/SqlTriggerRepository';
import { SqlAssetRepository } from '../../infrastructure/repositories/SqlAssetRepository';
import { randomUUID } from 'crypto';
import { STATUS_IDS, TRIGGER_STATUS_IDS } from '../constants';

export class RcaService {
    private rcaRepo: SqlRcaRepository;
    private actionRepo: SqlActionRepository;
    private triggerRepo: SqlTriggerRepository;
    private assetRepo: SqlAssetRepository;

    constructor(
        rcaRepo?: SqlRcaRepository,
        actionRepo?: SqlActionRepository,
        triggerRepo?: SqlTriggerRepository,
        assetRepo?: SqlAssetRepository
    ) {
        this.rcaRepo = rcaRepo || new SqlRcaRepository();
        this.actionRepo = actionRepo || new SqlActionRepository();
        this.triggerRepo = triggerRepo || new SqlTriggerRepository();
        this.assetRepo = assetRepo || new SqlAssetRepository();
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

        // 5. Sincronização de Gatilho (Issue #77)
        this.syncLinkedTrigger(rca);

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

        // 6. Sincronização de Gatilho (Issue #77)
        this.syncLinkedTrigger(rca);

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
            // Prioriza ações fornecidas no lote, mas se não houver, busca no banco para garantir
            // que o motor de status tenha o contexto completo.
            let rcaActions = providedActions.filter(a => a.rca_id?.trim().toLowerCase() === rca.id?.trim().toLowerCase());
            if (rcaActions.length === 0) {
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

        // 4.5 Persistência das ações (Novo: corrigindo bug de ações sumindo na importação)
        if (providedActions.length > 0) {
            this.actionRepo.bulkCreate(providedActions);
        }

        // 4.6 Persistência de Ativos (Novo: garantindo que Áreas/Equipamentos apareçam no Dashboard)
        this.syncAssetsFromRcas(processed);

        // 5. Sincronização de Gatilhos em massa (Issue #77)
        for (const rca of processed) {
            this.syncLinkedTrigger(rca);
        }

        return { count: processed.length };
    }

    // --- Lógica de Domínio ---

    private syncAssetsFromRcas(rcas: Rca[]): void {
        const assetsToSync = new Map<string, Asset>();

        // 1. Coleta Áreas Primeiro (Top Level)
        rcas.forEach(rca => {
            if (rca.area_id) {
                const key = `AREA:${rca.area_id}`;
                if (!assetsToSync.has(key)) {
                    assetsToSync.set(key, {
                        id: rca.area_id,
                        name: rca.area_id,
                        type: 'AREA'
                    });
                }
            }
        });

        // 2. Coleta Equipamentos (Filhos de Áreas)
        rcas.forEach(rca => {
            if (rca.area_id && rca.equipment_id) {
                const key = `EQUIP:${rca.equipment_id}`;
                if (!assetsToSync.has(key)) {
                    assetsToSync.set(key, {
                        id: rca.equipment_id,
                        name: rca.equipment_id,
                        type: 'EQUIPMENT',
                        parent_id: rca.area_id
                    });
                }
            }
        });

        // 3. Coleta Subgrupos (Filhos de Equipamentos)
        rcas.forEach(rca => {
            if (rca.equipment_id && rca.subgroup_id) {
                const key = `SUB:${rca.subgroup_id}`;
                if (!assetsToSync.has(key)) {
                    assetsToSync.set(key, {
                        id: rca.subgroup_id,
                        name: rca.subgroup_id,
                        type: 'SUBGROUP',
                        parent_id: rca.equipment_id
                    });
                }
            }
        });

        if (assetsToSync.size > 0) {
            // Converte o Map para Array respeitando a ordem de inserção (Áreas -> Equips -> Subs)
            this.assetRepo.bulkCreate(Array.from(assetsToSync.values()));
        }
    }

    /**
     * Sincroniza o status do gatilho vinculado com o estado atual da RCA.
     * Regras:
     * - RCA Concluída -> Gatilho Arquivado (T-STATUS-04)
     * - RCA Em Andamento / Aguardando -> Gatilho Em Análise (T-STATUS-02)
     */
    private syncLinkedTrigger(rca: Rca): void {
        const trigger = this.triggerRepo.findByRcaId(rca.id);
        if (trigger) {
            let newStatus = TRIGGER_STATUS_IDS.IN_ANALYSIS;

            if (rca.status === STATUS_IDS.CONCLUDED) {
                newStatus = TRIGGER_STATUS_IDS.ARCHIVED;
            }

            if (trigger.status !== newStatus) {
                trigger.status = newStatus;
                this.triggerRepo.update(trigger);
            }
        }
    }

    public migrateRcaData(rca: any): Rca {
        let migrated = { ...rca };

        // 0. Achatar estruturas legadas (investigation ou analyses) para o nível raiz
        const legacyObj = migrated.investigation || migrated.analyses;
        if (legacyObj && typeof legacyObj === 'object') {
            migrated = {
                ...migrated,
                five_whys: legacyObj.five_whys || migrated.five_whys,
                five_whys_chains: legacyObj.five_whys_chains || migrated.five_whys_chains,
                ishikawa: legacyObj.ishikawa || migrated.ishikawa,
                root_causes: legacyObj.root_causes || migrated.root_causes,
                precision_maintenance: legacyObj.precision_maintenance || migrated.precision_maintenance,
                human_reliability: legacyObj.human_reliability || migrated.human_reliability,
                containment_actions: legacyObj.containment_actions || migrated.containment_actions,
                lessons_learned: legacyObj.lessons_learned || migrated.lessons_learned
            };
        }

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

        // 5. Mapeamento de Checklists Legados (V17 com UUIDs -> V2 com IDs Técnicos)
        const withChecklists = this.mapLegacyChecklists(migrated);

        // 6. Mapeamento de Root Causes e Status (Strings -> IDs Técnicos)
        return this.mapLegacyTaxonomy(withChecklists);
    }

    private mapLegacyTaxonomy(rca: Rca): Rca {
        // 1. Mapeamento de Root Cause (6M)
        if (rca.root_causes && Array.isArray(rca.root_causes)) {
            const mMapping: Record<string, string> = {
                'Mão de obra': 'M1', 'Mao de obra': 'M1', 'Mão de Obra': 'M1',
                'Método': 'M2', 'Metodo': 'M2',
                'Material': 'M3',
                'Máquina': 'M4', 'Maquina': 'M4',
                'Meio Ambiente': 'M5', 'Meio ambiente': 'M5',
                'Medida': 'M6'
            };
            rca.root_causes = rca.root_causes.map(rc => ({
                ...rc,
                root_cause_m_id: mMapping[rc.root_cause_m_id] || rc.root_cause_m_id
            }));
        }

        // 2. Mapeamento de Status
        const statusMapping: Record<string, string> = {
            'Concluída': 'STATUS-03', 'Concluído': 'STATUS-03', 'Concluido': 'STATUS-03', 'Concluida': 'STATUS-03',
            'Em Andamento': 'STATUS-01', 'Em andamento': 'STATUS-01',
            'Aguardando Verificação': 'STATUS-02', 'Ag. Verif': 'STATUS-02'
        };
        if (rca.status && statusMapping[rca.status]) {
            rca.status = statusMapping[rca.status];
        }

        // 3. Mapeamento de Especialidade
        const specMapping: Record<string, string> = {
            'Mecânicas': 'MEC', 'Mecânica': 'MEC', 'Mecanica': 'MEC', 'Mecanicas': 'MEC',
            'Elétrica': 'ELE', 'Eletrica': 'ELE',
            'Instrumentação': 'INS', 'Instrumentacao': 'INS',
            'Automação': 'AUT', 'Automacao': 'AUT',
            'Operação': 'OPE', 'Operacao': 'OPE'
        };
        if (rca.specialty_id && specMapping[rca.specialty_id]) {
            rca.specialty_id = specMapping[rca.specialty_id];
        }

        // 4. Mapeamento de Tipo de Análise
        if (rca.analysis_type === 'RCA') rca.analysis_type = 'ANA-RCA';

        // 5. Normalização de IDs de Modo de Falha e Categoria (Remover acentos e espaços para IDs técnicos aproximados)
        const toTechId = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, '_') : str;

        if (rca.failure_mode_id && rca.failure_mode_id.length > 20) {
            rca.failure_mode_id = toTechId(rca.failure_mode_id);
        }
        if (rca.failure_category_id && rca.failure_category_id.length > 20) {
            rca.failure_category_id = toTechId(rca.failure_category_id);
        }

        return rca;
    }

    private mapLegacyChecklists(migrated: any): Rca {
        // Precision Maintenance Mapping
        if (migrated.precision_maintenance && Array.isArray(migrated.precision_maintenance)) {
            const precisionMap: Record<string, string> = {
                "Área está limpa e arrumada": "chk_clean",
                "Os ajustes e tolerâncias estão corretos": "chk_tol",
                "A lubrificação é limpa, livre de contaminantes, com a quantidade e qualidade adequadas": "chk_lube",
                "A correia tem tensão e alinhamento correctos": "chk_belt",
                "Cargas estão suportadas corretamento com montagens rígidas e suportes": "chk_load",
                "Componentes (eixos, motores, redutores, bombas, rolos, …)  estão devidamente alinhados": "chk_align",
                "Componentes rotativos estão balanceados": "chk_bal",
                "Torques e Tensões estão correctos, utilizando torquimetros apropriados, ...": "chk_torque",
                "Utilizados somente peças de acordo  com a especificação para o equipamento (no BOM)": "chk_parts",
                "Teste Funcional executado": "chk_func",
                "As modificações foram devidamente documentadas (atualização de desenhos, procedimentos, etc)": "chk_doc"
            };

            migrated.precision_maintenance = migrated.precision_maintenance.map((item: any) => {
                const techId = precisionMap[item.activity];
                if (techId) {
                    return { id: techId, status: item.status, comment: item.comment || '' };
                }
                return item;
            });
        }

        // Human Reliability Mapping
        if (migrated.human_reliability && Array.isArray(migrated.human_reliability.questions)) {
            const hraQuestionMap: Record<string, string> = {
                "Os procedimentos são precisos e revisados?": "1.1",
                "Os procedimentos estão alinhados com as práticas reais?": "1.3",
                "Há comunicação apropriada e métodos de compartilhamento e escalonamento?": "1.4",
                "Os materiais de treinamento refletem as informações e conhecimentos necessários para as competências identificadas?": "2.1",
                "Os conhecimentos e habilidades estão sendo adquiridos e retidos?": "2.2",
                "Há algum fator externo que possa afetar o desempenho do profissional: estresse, altos ruídos, calor/frio, vibração, atividades complexas, etc.?": "3.1",
                "Há flexibilidade e treinamentos cruzados disponíveis para os profissionais?": "4.1",
                "Os funcionários compreendem o valor e o impacto de seu trabalho?": "4.2",
                "As condições de trabalho têm situações que criam dificuldades práticas para os funcionários: localização e acesso as ferramentas/equipamentos, sequência ideal de tarefas e padrões apropriados em vigor?": "5.1",
                "Existem medidas para ajudar a identificar erros potenciais durante tarefas críticas, atividades ou eventos não rotineiros?": "6.1",
                "Há erros que podem ter acontecido por falta de atenção?": "6.2"
            };

            migrated.human_reliability.questions = migrated.human_reliability.questions.map((q: any) => {
                const techId = hraQuestionMap[q.question];
                if (techId) {
                    return { ...q, id: techId };
                }
                return q;
            });
        }

        if (migrated.human_reliability && Array.isArray(migrated.human_reliability.conclusions)) {
            const hraConclusionMap: Record<string, string> = {
                "Procedimentos e Comunicação": "procedures",
                "Treinamentos, materiais e sua eficiência": "training",
                "Impactos externos (físicos e cognitivos)": "external",
                "Trabalho rotineiro e monótono": "routine",
                "Organização do ambiente e dos processos": "organization",
                "Medidas contra falhas": "measures"
            };

            migrated.human_reliability.conclusions = migrated.human_reliability.conclusions.map((c: any) => {
                const techId = hraConclusionMap[c.label];
                if (techId) {
                    return { ...c, id: techId };
                }
                return c;
            });
        }

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