import { STATUS_IDS } from '../constants/SystemConstants';

/**
 * Traduz o nome de um status baseado no seu ID e no objeto de tradução (i18n).
 * Garante consistência em todo o sistema.
 */
export const translateStatus = (id: string, fallbackName: string, t: (key: string) => string): string => {
    switch (id) {
        case STATUS_IDS.IN_PROGRESS:
            return t('status.inProgress');
        case STATUS_IDS.CONCLUDED:
            return t('status.completed');
        case STATUS_IDS.WAITING_VERIFICATION:
            return t('status.waiting');
        case STATUS_IDS.CANCELLED:
            return t('status.canceled');
        case STATUS_IDS.DELAYED:
            return t('status.delayed');
        default:
            return fallbackName || id;
    }
};
