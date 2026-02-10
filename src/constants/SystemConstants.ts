export enum STATUS_IDS {
    IN_PROGRESS = 'STATUS-01',
    WAITING_VERIFICATION = 'STATUS-02',
    CONCLUDED = 'STATUS-03',
    DELAYED = 'STATUS-04',
    CANCELLED = 'STATUS-05'
}

export enum TRIGGER_STATUS_IDS {
    NEW = 'T-STATUS-01',
    IN_ANALYSIS = 'T-STATUS-02',
    CONVERTED = 'T-STATUS-03',
    ARCHIVED = 'T-STATUS-04'
}

export const STATUS_COLORS: Record<string, string> = {
    [STATUS_IDS.IN_PROGRESS]: '#3b82f6', // Blue 500
    [STATUS_IDS.WAITING_VERIFICATION]: '#f59e0b', // Amber 500
    [STATUS_IDS.CONCLUDED]: '#10b981', // Emerald 500
    [STATUS_IDS.DELAYED]: '#ef4444', // Red 500
    [STATUS_IDS.CANCELLED]: '#64748b', // Slate 500
};

export const ACTION_STATUS_IDS = {
    APPROVED: '1',
    IN_PROGRESS: '2',
    COMPLETED: '3',
    VERIFIED: '4'
};

export const ACTION_STATUS_COLORS: Record<string, string> = {
    [ACTION_STATUS_IDS.APPROVED]: '#10b981',    // Emerald 500
    [ACTION_STATUS_IDS.IN_PROGRESS]: '#f59e0b', // Amber 500
    [ACTION_STATUS_IDS.COMPLETED]: '#3b82f6',   // Blue 500
    [ACTION_STATUS_IDS.VERIFIED]: '#6366f1',    // Indigo 500
};

export enum ROOT_CAUSE_M_IDS {
    MANPOWER = 'M1',
    METHOD = 'M2',
    MACHINE = 'M3',
    MATERIAL = 'M4',
    MEASUREMENT = 'M5',
    ENVIRONMENT = 'M6'
}

export const ROOT_CAUSE_COLORS: Record<string, string> = {
    [ROOT_CAUSE_M_IDS.MANPOWER]: '#3b82f6',    // Blue
    [ROOT_CAUSE_M_IDS.METHOD]: '#10b981',      // Emerald
    [ROOT_CAUSE_M_IDS.MACHINE]: '#f59e0b',     // Amber
    [ROOT_CAUSE_M_IDS.MATERIAL]: '#6366f1',    // Indigo
    [ROOT_CAUSE_M_IDS.MEASUREMENT]: '#ec4899', // Pink
    [ROOT_CAUSE_M_IDS.ENVIRONMENT]: '#06b6d4', // Cyan
};
