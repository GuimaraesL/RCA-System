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
    if (translationKey) {
        const translated = t(translationKey);
        
        // Se temos uma tradução válida e o nome no banco é igual à tradução 
        // (ou é um dos nomes padrão conhecidos), usamos a tradução (que troca com o idioma).
        // Se o usuário editou no config, o fallbackName será diferente do traduzido, 
        // então respeitamos a vontade do usuário e usamos o fallbackName.
        const standardNames = ["Em Andamento", "Aguardando Verificação", "Concluída", "Cancelada", "Atrasada", "In Progress", "Waiting Verification", "Completed", "Canceled", "Delayed", "Aguardando"];
        
        if (translated && translated !== translationKey) {
            if (!fallbackName || standardNames.includes(fallbackName)) {
                return translated;
            }
        }
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

    const translationKey = idMap[id];
    if (translationKey) {
        const translated = t(translationKey);
        const standardNames = ["Novo", "Em Análise", "Convertido em RCA", "Arquivado", "New", "In Analysis", "Converted to RCA", "Archived"];
        
        if (translated && translated !== translationKey) {
            if (!fallbackName || standardNames.includes(fallbackName)) {
                return translated;
            }
        }
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

    const translationKey = idMap[id];
    if (translationKey) {
        const translated = t(translationKey);
        const standardNames = [
            "Mão de Obra", "Método", "Material", "Máquina", "Meio Ambiente", "Medida",
            "Manpower", "Method", "Machine", "Environment", "Measurement"
        ];

        if (translated && translated !== translationKey) {
            if (!fallbackName || standardNames.includes(fallbackName)) {
                return translated;
            }
        }
    }

    return fallbackName || id;
};
