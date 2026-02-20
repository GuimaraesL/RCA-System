/**
 * Proposta: Constantes globais do sistema e definições de IDs padrão.
 * Fluxo: Centraliza identificadores de status, categorias 6M e paletas de cores utilizadas em toda a interface e lógica de negócio.
 */

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

// Mapa centralizado de estilos visuais para badges de status (Issue #92)
export const STATUS_BADGE_STYLES: Record<string, string> = {
    [STATUS_IDS.IN_PROGRESS]: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    [STATUS_IDS.WAITING_VERIFICATION]: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    [STATUS_IDS.CONCLUDED]: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
    [STATUS_IDS.DELAYED]: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    [STATUS_IDS.CANCELLED]: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 line-through',
    [TRIGGER_STATUS_IDS.NEW]: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    [TRIGGER_STATUS_IDS.IN_ANALYSIS]: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    [TRIGGER_STATUS_IDS.CONVERTED]: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
    [TRIGGER_STATUS_IDS.ARCHIVED]: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

export const STATUS_BADGE_DEFAULT = 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';

/**
 * Retorna as classes Tailwind de estilo visual para um badge de status.
 * Fonte unica de verdade para cores de status em toda a interface.
 */
export const getStatusBadgeStyle = (statusId: string): string =>
    STATUS_BADGE_STYLES[statusId] || STATUS_BADGE_DEFAULT;

// Paleta Global de Gráficos (Tons Frios + Acentos)
export const CHART_PALETTE = [
    '#3b82f6', // Blue 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#6366f1', // Indigo 500
    '#ec4899', // Pink 500
    '#06b6d4', // Cyan 500
    '#ef4444', // Red 500
    '#84cc16', // Lime 500
    '#14b8a6', // Teal 500
    '#a855f7', // Purple 500 (Usar com cuidado, seguindo diretrizes)
];
