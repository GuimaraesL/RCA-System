
import { AssetNode, ActionRecord, TaxonomyConfig, TaxonomyItem, RcaRecord } from "../types";
import { generateId, getAssets, saveAssets, getActions, saveActions, getTaxonomy, saveTaxonomy, getRecords, saveRecords } from "./storageService";

export type CsvEntityType = 
    | 'ASSETS' 
    | 'ACTIONS' 
    | 'RECORDS_SUMMARY'
    | 'TAXONOMY_ANALYSIS_TYPES'
    | 'TAXONOMY_STATUSES'
    | 'TAXONOMY_SPECIALTIES'
    | 'TAXONOMY_FAILURE_MODES'
    | 'TAXONOMY_FAILURE_CATEGORIES'
    | 'TAXONOMY_COMPONENT_TYPES'
    | 'TAXONOMY_ROOT_CAUSE_MS';

const TAXONOMY_MAP: Record<string, keyof TaxonomyConfig> = {
    'TAXONOMY_ANALYSIS_TYPES': 'analysisTypes',
    'TAXONOMY_STATUSES': 'analysisStatuses',
    'TAXONOMY_SPECIALTIES': 'specialties',
    'TAXONOMY_FAILURE_MODES': 'failureModes',
    'TAXONOMY_FAILURE_CATEGORIES': 'failureCategories',
    'TAXONOMY_COMPONENT_TYPES': 'componentTypes',
    'TAXONOMY_ROOT_CAUSE_MS': 'rootCauseMs'
};

// --- HELPERS ---

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
            
            const stringVal = String(val);
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
    switch(type) {
        case 'ASSETS': return 'id;name;type;parentId';
        case 'ACTIONS': return 'id;rca_id;action;responsible;date;status;moc_number';
        case 'RECORDS_SUMMARY': return 'id;what;participants;problem_description;analysis_type;status;failure_date;downtime_minutes;financial_impact;area_id';
        default: return 'id;name';
    }
};

export const exportToCsv = (type: CsvEntityType): string => {
    if (type === 'ASSETS') {
        const assets = getAssets();
        const flatAssets: any[] = [];
        const traverse = (nodes: AssetNode[]) => {
            nodes.forEach(n => {
                flatAssets.push({
                    id: n.id,
                    name: n.name,
                    type: n.type,
                    parentId: n.parentId || ''
                });
                if (n.children) traverse(n.children);
            });
        };
        traverse(assets);
        return toCSV(flatAssets, ['id', 'name', 'type', 'parentId']);
    }

    if (type === 'ACTIONS') {
        const actions = getActions();
        return toCSV(actions, ['id', 'rca_id', 'action', 'responsible', 'date', 'status', 'moc_number']);
    }

    if (type === 'RECORDS_SUMMARY') {
        const records = getRecords();
        return toCSV(records, ['id', 'what', 'participants', 'problem_description', 'analysis_type', 'status', 'failure_date', 'downtime_minutes', 'financial_impact', 'area_id']);
    }

    const taxonomy = getTaxonomy();
    const key = TAXONOMY_MAP[type];
    if (key) {
        return toCSV(taxonomy[key] || [], ['id', 'name']);
    }

    return '';
};

// --- IMPORTERS ---

export const importFromCsv = (type: CsvEntityType, csvContent: string): { success: boolean, message: string } => {
    try {
        const rawData = fromCSV(csvContent);
        if (rawData.length === 0) return { success: false, message: "Empty or unreadable CSV file." };

        if (type === 'ASSETS') {
            const nodes: AssetNode[] = rawData.map(r => ({
                id: r.id || generateId('IMP'),
                name: r.name || 'Unnamed Asset', // Better fallback
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

            // Validation: Ensure we actually parsed something valid
            if (nodes.length > 0 && nodes.every(n => n.name === 'Unnamed Asset')) {
                 return { success: false, message: "Import failed: Could not read 'name' column. Check CSV delimiter (Use ; or ,)." };
            }

            saveAssets(rootNodes);
            return { success: true, message: `Successfully imported ${nodes.length} assets.` };
        }

        if (type === 'ACTIONS') {
            const actions: ActionRecord[] = rawData.map(r => ({
                id: r.id || generateId('ACT'),
                rca_id: r.rca_id || '',
                action: r.action || 'New Action',
                responsible: r.responsible || '',
                date: r.date || new Date().toISOString().split('T')[0],
                status: ['1','2','3','4'].includes(r.status) ? r.status : '1',
                moc_number: r.moc_number || ''
            }));
            
            const existing = getActions();
            const actionMap = new Map(existing.map(a => [a.id, a]));
            actions.forEach(a => actionMap.set(a.id, a));
            saveActions(Array.from(actionMap.values()));

            return { success: true, message: `Successfully imported ${actions.length} actions.` };
        }

        if (type === 'RECORDS_SUMMARY') {
            const existing = getRecords();
            const recordMap = new Map(existing.map(r => [r.id, r]));
            let updatedCount = 0;

            rawData.forEach(r => {
                if(r.id && recordMap.has(r.id)) {
                    const existingRec = recordMap.get(r.id)!;
                    
                    // Handle Participants Array
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
            saveRecords(Array.from(recordMap.values()));
            return { success: true, message: `Updated ${updatedCount} records from summary.` };
        }

        const key = TAXONOMY_MAP[type];
        if (key) {
            const taxonomy = getTaxonomy();
            const newItems: TaxonomyItem[] = rawData.map(r => ({
                id: r.id || generateId('TAX'),
                name: r.name || 'Unnamed Item'
            }));
            
            // Check if parsing failed completely
            if (newItems.length > 0 && newItems.every(i => i.name === 'Unnamed Item')) {
                 return { success: false, message: "Import failed: Could not read 'name' column." };
            }

            taxonomy[key] = newItems;
            saveTaxonomy(taxonomy);
            return { success: true, message: `Successfully imported ${newItems.length} items to ${key}.` };
        }

        return { success: false, message: "Unknown entity type selected." };

    } catch (e) {
        console.error(e);
        return { success: false, message: "Critical CSV Parsing Error." };
    }
};
