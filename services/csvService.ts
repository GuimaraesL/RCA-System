
import { AssetNode, ActionRecord, TaxonomyConfig, TaxonomyItem, RcaRecord, TriggerRecord } from "../types";
import { generateId } from "./utils";

export interface CsvContextData {
    records?: RcaRecord[];
    assets?: AssetNode[];
    actions?: ActionRecord[];
    triggers?: TriggerRecord[];
    taxonomy?: TaxonomyConfig;
}

export interface CsvImportResult {
    success: boolean;
    message: string;
    data?: any;
    dataType?: CsvEntityType;
}

export type CsvEntityType =
    | 'ASSETS'
    | 'ACTIONS'
    | 'RECORDS_SUMMARY'
    | 'TRIGGERS'
    | 'TAXONOMY_ANALYSIS_TYPES'
    | 'TAXONOMY_STATUSES'
    | 'TAXONOMY_SPECIALTIES'
    | 'TAXONOMY_FAILURE_MODES'
    | 'TAXONOMY_FAILURE_CATEGORIES'
    | 'TAXONOMY_COMPONENT_TYPES'
    | 'TAXONOMY_ROOT_CAUSE_MS'
    | 'TAXONOMY_TRIGGER_STATUSES';

const TAXONOMY_MAP: Record<string, keyof TaxonomyConfig> = {
    'TAXONOMY_ANALYSIS_TYPES': 'analysisTypes',
    'TAXONOMY_STATUSES': 'analysisStatuses',
    'TAXONOMY_SPECIALTIES': 'specialties',
    'TAXONOMY_FAILURE_MODES': 'failureModes',
    'TAXONOMY_FAILURE_CATEGORIES': 'failureCategories',
    'TAXONOMY_COMPONENT_TYPES': 'componentTypes',
    'TAXONOMY_ROOT_CAUSE_MS': 'rootCauseMs',
    'TAXONOMY_TRIGGER_STATUSES': 'triggerStatuses'
};

// --- HELPERS ---

// Helper to parse DD/MM/YYYY HH:mm or DD/MM/YYYY to ISO String
const parseDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const parts = dateStr.trim().split(' ');
        const dateParts = parts[0].split('/');

        if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            const time = parts[1] || '00:00';
            return `${year}-${month}-${day}T${time}`;
        }
        return new Date(dateStr).toISOString(); // Fallback
    } catch (e) {
        return '';
    }
};

const toCSV = (data: any[], headers: string[]): string => {
    const headerRow = headers.join(';'); // Export with semicolon for better Excel compatibility in many regions
    const rows = data.map(row => {
        return headers.map(fieldName => {
            let val = row[fieldName];
            // Handle Arrays (e.g., participants)
            if (Array.isArray(val)) {
                val = val.join('|'); // Use pipe for inner arrays to avoid conflict
            } else if (val === undefined || val === null) {
                val = '';
            }

            let stringVal = String(val);

            // SECURITY: CSV Injection / Formula Injection Prevention
            if (/^[=+\-@]/.test(stringVal)) {
                stringVal = "'" + stringVal;
            }

            // Escape quotes and wrap in quotes if contains delimiter or newline
            if (stringVal.includes(';') || stringVal.includes('"') || stringVal.includes('\n')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        }).join(';');
    });
    return [headerRow, ...rows].join('\n');
};

const detectSeparator = (headerLine: string): string => {
    const commas = (headerLine.match(/,/g) || []).length;
    const semicolons = (headerLine.match(/;/g) || []).length;
    return semicolons >= commas ? ';' : ',';
};

const fromCSV = (csv: string): any[] => {
    const lines = csv.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Auto-detect separator from first line
    const separator = detectSeparator(lines[0]);

    // Parse Headers and clean them (remove whitespace/BOM)
    const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));

    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i];
        const values: string[] = [];
        let currentVal = '';
        let insideQuote = false;

        for (let j = 0; j < currentLine.length; j++) {
            const char = currentLine[j];
            if (char === '"') {
                if (j < currentLine.length - 1 && currentLine[j + 1] === '"') {
                    currentVal += '"';
                    j++;
                } else {
                    insideQuote = !insideQuote;
                }
            } else if (char === separator && !insideQuote) {
                values.push(currentVal);
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        values.push(currentVal);

        const obj: any = {};
        headers.forEach((h, index) => {
            let val = values[index] ? values[index].trim() : '';
            // Remove wrapping quotes from value if present
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1).replace(/""/g, '"');
            }
            obj[h] = val;
        });

        // Only add row if it has some data (ignore empty trailing lines)
        if (Object.values(obj).some(v => v !== '')) {
            result.push(obj);
        }
    }
    return result;
};

// --- EXPORTERS ---

export const getCsvTemplate = (type: CsvEntityType): string => {
    // We use semicolons in template to guide user towards Excel-friendly format
    switch (type) {
        case 'ASSETS': return 'id;name;type;parentId';
        case 'ACTIONS': return 'id;rca_id;action;responsible;date;status;moc_number';
        case 'TRIGGERS': return 'AREA;Equip.;Subconjunto;Data/Hora Início;Data/Hora Fim;Duração (min);Tipo Parada;Razão Parada;Comentários;Tipo AF;Status;Responsável;ID AF';
        case 'RECORDS_SUMMARY': return 'id;what;participants;problem_description;analysis_type;status;failure_date;downtime_minutes;financial_impact;area_id';
        default: return 'id;name';
    }
};

export const exportToCsv = (type: CsvEntityType, context: CsvContextData): string => {
    const { assets = [], actions = [], triggers = [], records = [], taxonomy = { analysisTypes: [], analysisStatuses: [], specialties: [], failureModes: [], failureCategories: [], componentTypes: [], rootCauseMs: [], triggerStatuses: [] } } = context;

    if (type === 'ASSETS') {
        const flatAssets: any[] = [];
        // Fix: Pass parentId down the recursion explicitly
        const traverse = (nodes: AssetNode[], currentParentId: string | null) => {
            nodes.forEach(n => {
                flatAssets.push({
                    id: n.id,
                    name: n.name,
                    type: n.type,
                    parentId: currentParentId // Use passed parentId directly
                });
                if (n.children) traverse(n.children, n.id);
            });
        };
        traverse(assets, null);
        return toCSV(flatAssets, ['id', 'name', 'type', 'parentId']);
    }

    if (type === 'ACTIONS') {
        return toCSV(actions, ['id', 'rca_id', 'action', 'responsible', 'date', 'status', 'moc_number']);
    }

    if (type === 'TRIGGERS') {
        // Map internal structure back to Excel column names
        const rows = triggers.map(t => ({
            'AREA': t.area_id,
            'Equip.': t.equipment_id,
            'Subconjunto': t.subgroup_id,
            'Data/Hora Início': t.start_date,
            'Data/Hora Fim': t.end_date,
            'Duração (min)': t.duration_minutes,
            'Tipo Parada': t.stop_type,
            'Razão Parada': t.stop_reason,
            'Comentários': t.comments,
            'Tipo AF': t.analysis_type_id,
            'Status': t.status,
            'Responsável': t.responsible,
            'ID AF': t.rca_id
        }));
        return toCSV(rows, ['AREA', 'Equip.', 'Subconjunto', 'Data/Hora Início', 'Data/Hora Fim', 'Duração (min)', 'Tipo Parada', 'Razão Parada', 'Comentários', 'Tipo AF', 'Status', 'Responsável', 'ID AF']);
    }

    if (type === 'RECORDS_SUMMARY') {
        return toCSV(records, ['id', 'what', 'participants', 'problem_description', 'analysis_type', 'status', 'failure_date', 'downtime_minutes', 'financial_impact', 'area_id']);
    }

    const taxonomyKey = TAXONOMY_MAP[type];
    if (taxonomyKey && taxonomy) {
        return toCSV(taxonomy[taxonomyKey] || [], ['id', 'name']);
    }

    return '';
};

// --- IMPORTERS ---

export const importFromCsv = (type: CsvEntityType, csvContent: string, context: CsvContextData): CsvImportResult => {
    try {
        const rawData = fromCSV(csvContent) as any[];
        if (rawData.length === 0) return { success: false, message: "Empty or unreadable CSV file." };

        const { assets = [], taxonomy = { analysisTypes: [], analysisStatuses: [], specialties: [], failureModes: [], failureCategories: [], componentTypes: [], rootCauseMs: [], triggerStatuses: [] }, triggers: existingTriggers = [], actions: existingActions = [], records: existingRecords = [] } = context;

        if (type === 'ASSETS') {
            const nodes: AssetNode[] = rawData.map(r => ({
                id: r.id || generateId('IMP'),
                name: r.name || 'Unnamed Asset',
                type: (r.type === 'AREA' || r.type === 'EQUIPMENT' || r.type === 'SUBGROUP') ? r.type : 'AREA',
                parentId: r.parentId || undefined,
                children: []
            }));

            const nodeMap = new Map<string, AssetNode>();
            nodes.forEach(n => nodeMap.set(n.id, n));

            const rootNodes: AssetNode[] = [];

            // Reconstruct Hierarchy
            nodes.forEach(n => {
                if (n.parentId && nodeMap.has(n.parentId)) {
                    const parent = nodeMap.get(n.parentId)!;
                    parent.children = parent.children || [];
                    parent.children.push(n);
                } else {
                    rootNodes.push(n);
                }
            });

            if (nodes.length > 0 && nodes.every(n => n.name === 'Unnamed Asset')) {
                return { success: false, message: "Import failed: Could not read 'name' column. Check CSV delimiter (Use ; or ,)." };
            }

            return {
                success: true,
                message: `Successfully parsed ${nodes.length} assets.`,
                data: rootNodes,
                dataType: 'ASSETS'
            };
        }

        if (type === 'TRIGGERS') {
            const newTriggers: TriggerRecord[] = [];

            // Helper to find asset ID by Name (Recursive)
            const findAssetId = (name: string, nodes: AssetNode[]): string => {
                if (!name) return '';
                const cleanName = name.trim().toLowerCase();
                for (const node of nodes) {
                    if (node.name.toLowerCase() === cleanName || node.id === name) return node.id;
                    if (node.children) {
                        const found = findAssetId(name, node.children);
                        if (found) return found;
                    }
                }
                return '';
            };

            // Helper to find Taxonomy ID by Name
            const findTaxonomyId = (list: TaxonomyItem[], name: string): string => {
                if (!name) return '';
                const found = list.find(i => i.name.toLowerCase() === name.toLowerCase().trim() || i.id === name);
                return found ? found.id : '';
            };

            const defaultStatusId = taxonomy.triggerStatuses?.[0]?.id || 'TRG-ST-01';

            rawData.forEach(r => {
                const statusName = r['Status'] || '';
                let statusId = findTaxonomyId(taxonomy.triggerStatuses || [], statusName);
                if (!statusId) statusId = defaultStatusId;

                const areaId = findAssetId(r['AREA'], assets);
                const equipId = findAssetId(r['Equip.'], assets);
                const subId = findAssetId(r['Subconjunto'], assets);
                const typeId = findTaxonomyId(taxonomy.analysisTypes || [], r['Tipo AF']);

                const trigger: TriggerRecord = {
                    id: generateId('TRG'),
                    area_id: areaId,
                    equipment_id: equipId,
                    subgroup_id: subId,
                    start_date: parseDateString(r['Data/Hora Início']),
                    end_date: parseDateString(r['Data/Hora Fim']),
                    duration_minutes: parseInt(r['Duração (min)']) || 0,
                    stop_type: r['Tipo Parada'] || '',
                    stop_reason: r['Razão Parada'] || '',
                    comments: r['Comentários'] || '',
                    analysis_type_id: typeId,
                    status: statusId,
                    responsible: r['Responsável'] || '',
                    rca_id: r['ID AF'] || ''
                };
                newTriggers.push(trigger);
            });

            // Return merged triggers as existing logic implied full context update
            // However, MigrationView will use saveTriggers (which replaces).
            // So we return the MERGED status.
            const mergedTriggers = [...existingTriggers, ...newTriggers];

            return {
                success: true,
                message: `Successfully parsed ${newTriggers.length} new triggers.`,
                data: mergedTriggers,
                dataType: 'TRIGGERS'
            };
        }

        if (type === 'ACTIONS') {
            const actions: ActionRecord[] = rawData.map(r => ({
                id: r.id || generateId('ACT'),
                rca_id: r.rca_id || '',
                action: r.action || 'New Action',
                responsible: r.responsible || '',
                date: r.date || new Date().toISOString().split('T')[0],
                status: ['1', '2', '3', '4'].includes(r.status) ? r.status : '1',
                moc_number: r.moc_number || ''
            }));

            const actionMap = new Map(existingActions.map(a => [a.id, a]));
            actions.forEach(a => actionMap.set(a.id, a));
            const mergedActions = Array.from(actionMap.values());

            return {
                success: true,
                message: `Successfully parsed ${actions.length} actions.`,
                data: mergedActions,
                dataType: 'ACTIONS'
            };
        }

        if (type === 'RECORDS_SUMMARY') {
            const recordMap = new Map(existingRecords.map(r => [r.id, r]));
            let updatedCount = 0;

            rawData.forEach(r => {
                if (r.id && recordMap.has(r.id)) {
                    const existingRec = recordMap.get(r.id)!;

                    let parts: string[] = existingRec.participants;
                    if (r.participants) {
                        parts = r.participants.split('|').map((p: string) => p.trim()).filter((p: string) => p);
                    }

                    Object.assign(existingRec, {
                        what: r.what || existingRec.what,
                        participants: parts,
                        problem_description: r.problem_description || existingRec.problem_description,
                        analysis_type: r.analysis_type || existingRec.analysis_type,
                        status: r.status || existingRec.status,
                        failure_date: r.failure_date || existingRec.failure_date,
                        downtime_minutes: Number(r.downtime_minutes) || existingRec.downtime_minutes,
                        financial_impact: Number(r.financial_impact) || existingRec.financial_impact,
                        area_id: r.area_id || existingRec.area_id
                    });
                    updatedCount++;
                }
            });
            const mergedRecords = Array.from(recordMap.values());

            return {
                success: true,
                message: `Updated ${updatedCount} records from summary.`,
                data: mergedRecords,
                dataType: 'RECORDS_SUMMARY'
            };
        }

        const taxonomyKey = TAXONOMY_MAP[type];
        if (taxonomyKey) {
            const newItems: TaxonomyItem[] = rawData.map(r => ({
                id: r.id || generateId('TAX'),
                name: r.name || 'Unnamed Item'
            }));

            if (newItems.length > 0 && newItems.every(i => i.name === 'Unnamed Item')) {
                return { success: false, message: "Import failed: Could not read 'name' column." };
            }

            const currentTaxonomy = { ...taxonomy };
            if (taxonomyKey in currentTaxonomy) {
                // @ts-ignore
                currentTaxonomy[taxonomyKey] = newItems;
            }

            return {
                success: true,
                message: `Successfully parsed ${newItems.length} items to ${taxonomyKey}.`,
                data: currentTaxonomy,
                dataType: type
            };
        }

        return { success: false, message: "Unknown entity type selected." };

    } catch (e) {
        console.error(e);
        return { success: false, message: "Critical CSV Parsing Error." };
    }
};
