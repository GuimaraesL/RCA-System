import { STATUS_IDS, ROOT_CAUSE_M_IDS, TRIGGER_STATUS_IDS } from '../constants/SystemConstants';

/**
 * Traduz o nome de um status baseado no seu ID e no objeto de tradução (i18n).
 * Se o fallbackName (vindo da taxonomia/DB) for diferente da tradução padrão, 
 * assume-se que o usuário personalizou o nome e este é priorizado.
 */
export const translateStatus = (id: string, fallbackName: string, t: (key: string) => string): string => {
    const idMap: Record<string, string> = {
        [STATUS_IDS.IN_PROGRESS]: 'status.inProgress',
        [STATUS_IDS.CONCLUDED]: 'status.completed',
        [STATUS_IDS.WAITING_VERIFICATION]: 'status.waiting',
        [STATUS_IDS.CANCELLED]: 'status.canceled',
        [STATUS_IDS.DELAYED]: 'status.delayed',
        'STATUS-DONE': 'status.completed',
        'STATUS-WAITING': 'status.waiting'
    };

    const translationKey = idMap[id];
    const standardNames = [
        "Em Andamento", "Aguardando Verificação", "Concluída", "Cancelada", "Atrasada", "Pendente",
        "In Progress", "Waiting Verification", "Completed", "Canceled", "Delayed", "Aguardando", "Em Aberto",
        "Aguardando Aprovação"
    ];

    if (translationKey && (!fallbackName || standardNames.includes(fallbackName))) {
        return t(translationKey);
    }

    return fallbackName || id;
};

/**
 * Traduz o nome de um status de gatilho baseado no seu ID.
 */
export const translateTriggerStatus = (id: string, fallbackName: string, t: (key: string) => string): string => {
    const idMap: Record<string, string> = {
        [TRIGGER_STATUS_IDS.NEW]: 'triggerStatus.new',
        [TRIGGER_STATUS_IDS.IN_ANALYSIS]: 'triggerStatus.inAnalysis',
        [TRIGGER_STATUS_IDS.CONVERTED]: 'triggerStatus.converted',
        [TRIGGER_STATUS_IDS.ARCHIVED]: 'triggerStatus.archived'
    };

    const standardNames = [
        "Novo", "Em Análise", "Convertido em RCA", "Arquivado", 
        "New", "In Analysis", "Converted to RCA", "Archived",
        "Não iniciada", "Em andamento", "Concluída", "Atrasada", "Removido"
    ];

    const translationKey = idMap[id];
    if (translationKey && (!fallbackName || standardNames.includes(fallbackName))) {
        return t(translationKey);
    }

    return fallbackName || id;
};

/**
 * Traduz o nome de um fator 6M baseado no seu ID.
 */
export const translate6M = (id: string, fallbackName: string, t: (key: string) => string): string => {
    const idMap: Record<string, string> = {
        [ROOT_CAUSE_M_IDS.MANPOWER]: 'rootCauseMs.manpower',
        [ROOT_CAUSE_M_IDS.METHOD]: 'rootCauseMs.method',
        [ROOT_CAUSE_M_IDS.MATERIAL]: 'rootCauseMs.material',
        [ROOT_CAUSE_M_IDS.MACHINE]: 'rootCauseMs.machine',
        [ROOT_CAUSE_M_IDS.ENVIRONMENT]: 'rootCauseMs.environment',
        [ROOT_CAUSE_M_IDS.MEASUREMENT]: 'rootCauseMs.measurement',
        'M-01': 'rootCauseMs.environment',
        'M-02': 'rootCauseMs.machine',
        'M-03': 'rootCauseMs.manpower',
        'M-04': 'rootCauseMs.measurement',
        'M-05': 'rootCauseMs.method',
        'M-06': 'rootCauseMs.material'
    };

    const standardNames = [
        "Mão de Obra", "Método", "Material", "Máquina", "Meio Ambiente", "Medida",
        "Manpower", "Method", "Machine", "Environment", "Measurement",
        "Sistema de Medição"
    ];

    const translationKey = idMap[id];
    if (translationKey && (!fallbackName || standardNames.includes(fallbackName))) {
        return t(translationKey);
    }

    return fallbackName || id;
};
