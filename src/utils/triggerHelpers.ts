
import { AssetNode, TaxonomyConfig } from '../types';
import { STATUS_IDS, TRIGGER_STATUS_IDS } from '../constants/SystemConstants';

// Refactored to Iterative BFS to prevent Maximum Call Stack Size Exceeded (Stack Overflow)
export const getAssetName = (id: string, nodes: AssetNode[]): string => {
    if (!id) return '';
    if (!nodes || nodes.length === 0) return id;

    const queue = [...nodes];
    // Use Set to prevent infinite loops in case of circular references in data
    const visited = new Set<string>();
    let safetyCounter = 0;

    while (queue.length > 0) {
        safetyCounter++;
        if (safetyCounter > 50000) {
            console.warn('getAssetName hit safety limit (possible cycle):', id);
            return id;
        }

        const node = queue.shift();
        if (!node) continue;

        if (visited.has(node.id)) continue;
        visited.add(node.id);

        if (node.id === id) return node.name;

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                queue.push(child);
            }
        }
    }
    return id; // fallback to ID if not found
};

export const getTaxonomyName = (list: any[], id: string) => {
    const item = list?.find(i => i.id === id);
    return item ? item.name : id;
};

export const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(diff / 60000); // Minutes
};

export const findAssetPath = (nodes: AssetNode[], targetId: string): AssetNode[] | null => {
    for (const node of nodes) {
        if (node.id === targetId) return [node];
        if (node.children) {
            const path = findAssetPath(node.children, targetId);
            if (path) return [node, ...path];
        }
    }
    return null;
};

// Helper to get status badge color based on ID
export const getStatusColor = (statusId: string, taxonomy: TaxonomyConfig) => {
    switch (statusId) {
        // RCA Statuses
        case STATUS_IDS.IN_PROGRESS:
            return 'bg-blue-100 text-blue-700';
        case 'STATUS-02': // Legacy handling
        case STATUS_IDS.WAITING_VERIFICATION:
            return 'bg-purple-100 text-purple-700'; // Differentiating Waiting Verification
        case STATUS_IDS.CONCLUDED:
            return 'bg-green-100 text-green-700';
        case STATUS_IDS.DELAYED:
            return 'bg-red-100 text-red-700';
        case STATUS_IDS.CANCELLED:
        case 'REMOVED': // Legacy/String fallback if needed?
            return 'bg-slate-200 text-slate-500 line-through';

        // Trigger Statuses
        case TRIGGER_STATUS_IDS.NEW:
            return 'bg-blue-50 text-blue-600 border border-blue-100';
        case TRIGGER_STATUS_IDS.IN_ANALYSIS:
            return 'bg-amber-50 text-amber-600 border border-amber-100';
        case TRIGGER_STATUS_IDS.CONVERTED:
            return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        case TRIGGER_STATUS_IDS.ARCHIVED:
            return 'bg-slate-100 text-slate-500 border border-slate-200';

        default:
            // Fallback for names if ID match fails (transitional)
            const name = getTaxonomyName(taxonomy.triggerStatuses || [], statusId);
            if (name === 'Concluída' || name === 'Convertido em RCA') return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
            return 'bg-gray-50 text-gray-600';
    }
};

// Calculate Farol (Days Open)
export const getFarol = (startDate: string, statusId: string, taxonomy: TaxonomyConfig) => {
    if (!startDate) return { days: 0, color: 'bg-gray-100 text-gray-500' };

    try {
        // NEW LOGIC: Use ID directly
        if (statusId === STATUS_IDS.CONCLUDED || statusId === TRIGGER_STATUS_IDS.CONVERTED) {
            return { days: 'CHECK', color: 'bg-green-100 text-green-700 border border-green-200' };
        }

        // Stop counting if Concluded or Removed/Cancelled
        const isClosed = statusId === STATUS_IDS.CONCLUDED || 
                         statusId === STATUS_IDS.CANCELLED || 
                         statusId === TRIGGER_STATUS_IDS.CONVERTED || 
                         statusId === TRIGGER_STATUS_IDS.ARCHIVED || 
                         statusId === 'REMOVED' || statusId === 'IGNORADA';

        // Styling based on time open
        const start = new Date(startDate);
        if (isNaN(start.getTime())) return { days: 0, color: 'bg-gray-100 text-gray-500' }; // Handle invalid date

        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let color = 'bg-green-100 text-green-700';
        if (days >= 3) color = 'bg-yellow-100 text-yellow-700';
        if (days >= 7) color = 'bg-red-100 text-red-700';

        if (isClosed) {
            color = 'bg-gray-100 text-gray-400'; // Dimmed for closed items
        }

        return { days, color };
    } catch (e) {
        console.error("Error calculating Farol:", e);
        return { days: 0, color: 'bg-red-500 text-white' };
    }
};
