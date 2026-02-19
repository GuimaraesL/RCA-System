/**
 * Proposta: Definição de constantes globais e Enums do domínio.
 */

export enum STATUS_IDS {
    IN_PROGRESS = 'STATUS-01',
    WAITING_VERIFICATION = 'STATUS-02',
    CONCLUDED = 'STATUS-03',
    DELAYED = 'STATUS-04',
    CANCELLED = 'STATUS-05'
}

export enum ROOT_CAUSE_M_IDS {
    MANPOWER = 'M1',
    METHOD = 'M2',
    MACHINE = 'M3',
    MATERIAL = 'M4',
    MEASUREMENT = 'M5',
    ENVIRONMENT = 'M6'
}

export enum TRIGGER_STATUS_IDS {
    NEW = 'T-STATUS-01',
    IN_ANALYSIS = 'T-STATUS-02',
    CONVERTED = 'T-STATUS-03',
    ARCHIVED = 'T-STATUS-04'
}