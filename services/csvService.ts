
import { AssetNode, ActionRecord, TaxonomyConfig, TaxonomyItem, RcaRecord, TriggerRecord } from "../types";
import { generateId } from "./utils";
import { findAssetPath } from "../utils/triggerHelpers";

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

// --- SCHEMA VALIDATION ---
// Mapa de colunas obrigatórias para cada tipo de entidade
const REQUIRED_HEADERS: Record<CsvEntityType, string[]> = {
    'ASSETS': ['name', 'type'], // id e parentId podem ser gerados/opcionais
    'ACTIONS': ['action', 'responsible'], // campos mínimos obrigatórios
    'TRIGGERS': ['AREA', 'Equip.', 'Data/Hora Início'], // colunas chave do Excel de gatilhos
    'RECORDS_SUMMARY': ['id'], // precisa do ID para fazer update
    'TAXONOMY_ANALYSIS_TYPES': ['name'],
    'TAXONOMY_STATUSES': ['name'],
    'TAXONOMY_SPECIALTIES': ['name'],
    'TAXONOMY_FAILURE_MODES': ['name', 'specialty_ids'], // Optional but good for validation
    'TAXONOMY_FAILURE_CATEGORIES': ['name'],
    'TAXONOMY_COMPONENT_TYPES': ['name'],
    'TAXONOMY_ROOT_CAUSE_MS': ['name'],
    'TAXONOMY_TRIGGER_STATUSES': ['name']
};

// Função para validar se o CSV tem as colunas esperadas
const validateCsvSchema = (type: CsvEntityType, headers: string[]): { valid: boolean, message: string } => {
    const required = REQUIRED_HEADERS[type];
    if (!required) return { valid: true, message: '' };

    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
    const missing = required.filter(r => !normalizedHeaders.includes(r.toLowerCase()));

    if (missing.length > 0) {
        return {
            valid: false,
            message: `Schema inválido para ${type}. Colunas obrigatórias faltando: [${missing.join(', ')}]. Colunas recebidas: [${headers.join(', ')}].`
        };
    }
    return { valid: true, message: '' };
};

// --- HELPERS ---

// Helper to parse DD/MM/YYYY HH:mm or DD/MM/YYYY to ISO String
const parseDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const cleanStr = String(dateStr).trim();

        // 1. Detect Excel Serial Date (e.g. "45848" or "45848,48681")
        // Regex allows integer or float with dot/comma
        if (/^\d+([.,]\d+)?$/.test(cleanStr)) {
            const serial = parseFloat(cleanStr.replace(',', '.'));
            // Excel base date: Dec 30 1899 (approx 25569 days offset from Unix Epoch)
            // 25569 is the offset for 1970-01-01.
            // Check sanity: > 20000 ensures roughly > 1954 year.
            if (!isNaN(serial) && serial > 20000) {
                // Excel days -> key: (serial - 25569) * 86400 * 1000
                // Adjust for Excel leap year bug 1900 if necessary (usually ignored for modern dates)
                const utcDays = Math.floor(serial - 25569);
                const utcValue = utcDays * 86400; // seconds
                const dateInfo = new Date(utcValue * 1000);

                // Add fractional part (Time)
                const fractionalDay = serial - Math.floor(serial) + 0.0000001;
                const totalSeconds = Math.floor(86400 * fractionalDay);

                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                dateInfo.setUTCHours(hours, minutes, seconds);
                return dateInfo.toISOString();
            }
        }

        // 2. Standard Formats (DD/MM/YYYY)
        const parts = cleanStr.split(' ');
        const dateParts = parts[0].split('/');

        if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];

            // Validate limits
            if (parseInt(month) > 12 || parseInt(day) > 31) return '';

            const time = parts[1] || '00:00';
            // Construct ISO for local time or UTC? Ideally project uses simplified strings
            // Using logic to force ISO format YYYY-MM-DDTHH:mm:ss.sssZ
            // But manually constructing string is safer for "YYYY-MM-DDTHH:mm"
            return `${year}-${month}-${day}T${time}`;
        }

        // 3. Last Resort: Date Constructor
        const fallback = new Date(cleanStr);
        if (!isNaN(fallback.getTime())) {
            return fallback.toISOString();
        }

        return '';
    } catch (e) {
        console.warn('Date Parse Error:', dateStr, e);
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
    // Robust CSV Parser (Manual) to handle Multiline Fields
    // 1. Detect Separator (Naive check on first line approximation)
    let firstLineEnd = csv.indexOf('\n');
    if (firstLineEnd === -1) firstLineEnd = csv.length;
    const firstLine = csv.substring(0, firstLineEnd);
    const separator = detectSeparator(firstLine);

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = '';
    let insideQuote = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                // Escaped quote ("") -> Add single quote and skip next
                currentVal += '"';
                i++;
            } else {
                // Toggle quote state
                insideQuote = !insideQuote;
            }
        } else if (char === separator && !insideQuote) {
            // End of column
            currentRow.push(currentVal);
            currentVal = '';
        } else if ((char === '\r' || char === '\n') && !insideQuote) {
            // End of row
            // Handle \r\n or just \n
            if (char === '\r' && nextChar === '\n') {
                i++;
            }

            // Push column
            currentRow.push(currentVal);
            // Push row if valid
            if (currentRow.length > 0 && currentRow.some(c => c.trim().length > 0)) {
                rows.push(currentRow);
            }

            currentRow = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    // Push last row if exists
    if (currentRow.length > 0 || currentVal !== '') {
        currentRow.push(currentVal);
        if (currentRow.some(c => c.trim().length > 0)) {
            rows.push(currentRow);
        }
    }

    if (rows.length === 0) return [];

    // Extract Headers
    const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, '')); // Remove encapsulating quotes and BOM
    const dataRows = rows.slice(1);

    return dataRows.map(rowValues => {
        const obj: any = {};
        headers.forEach((h, index) => {
            // Values are already unescaped by our state machine, just trim whitespace if desired
            // Standard CSV: Spaces around delimiters are part of the value unless quoted.
            // We trim for safety.
            const val = rowValues[index] || '';
            obj[h] = val.trim();
        });
        return obj;
    });
};

// --- EXPORTERS ---

export const getCsvTemplate = (type: CsvEntityType): string => {
    // We use semicolons in template to guide user towards Excel-friendly format
    switch (type) {
        case 'ASSETS': return 'id;name;type;parentId';
        case 'ACTIONS': return 'id;rca_id;action;responsible;date;status;moc_number';
        case 'TRIGGERS': return 'ID;AREA;Equip.;Subconjunto;Data/Hora Início;Data/Hora Fim;Duração (min);Tipo Parada;Razão Parada;Comentários;Tipo AF;Status;Responsável;ID AF;Path';
        case 'RECORDS_SUMMARY': return 'id;what;issue_description;analysis_type;status;failure_date;failure_time;downtime_minutes;analysis_duration_minutes;financial_impact;area_id;equipment_id;subgroup_id;component_type;who;when;where_description;problem_description;participants;root_causes;potential_impacts;lessons_learned;version;file_path;specialty_id;failure_mode_id;failure_category_id';
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
            'ID': t.id,
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
            'ID AF': t.rca_id,
            'Path': t.file_path || ''
        }));
        return toCSV(rows, ['AREA', 'Equip.', 'Subconjunto', 'Data/Hora Início', 'Data/Hora Fim', 'Duração (min)', 'Tipo Parada', 'Razão Parada', 'Comentários', 'Tipo AF', 'Status', 'Responsável', 'ID AF', 'Path']);
    }

    if (type === 'RECORDS_SUMMARY') {
        const header = ['id', 'what', 'problem_description', 'analysis_type', 'status', 'failure_date', 'failure_time', 'downtime_minutes', 'analysis_duration_minutes', 'financial_impact', 'area_id', 'equipment_id', 'subgroup_id', 'component_type', 'who', 'when', 'where_description', 'participants', 'root_causes', 'potential_impacts', 'lessons_learned', 'version', 'file_path', 'specialty_id', 'failure_mode_id', 'failure_category_id'];

        // Custom Mapper for Complex Fields
        const rows = records.map(r => {
            // Helper for Lists
            const joinList = (val: any) => Array.isArray(val) ? val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('|') : String(val || '');
            const rootCauses = Array.isArray(r.root_causes) ? r.root_causes.map(rc => rc.cause).join('|') : '';

            return {
                ...r,
                participants: joinList(r.participants),
                root_causes: rootCauses,
                potential_impacts: joinList(r.potential_impacts),
                lessons_learned: joinList(r.lessons_learned)
            };
        });

        return toCSV(rows, header);
    }

    const taxonomyKey = TAXONOMY_MAP[type];
    if (taxonomyKey && taxonomy) {
        const items = (taxonomy[taxonomyKey] as TaxonomyItem[]) || [];

        // Custom Logic for Failure Modes with Specialty Dependency
        if (type === 'TAXONOMY_FAILURE_MODES') {
            const rows = items.map((i: any) => ({
                id: i.id,
                name: i.name,
                specialty_ids: i.specialty_ids ? i.specialty_ids.join('|') : ''
            }));
            return toCSV(rows, ['id', 'name', 'specialty_ids']);
        }

        return toCSV(items, ['id', 'name']);
    }

    return '';
};

// --- IMPORTERS ---

export const importFromCsv = (type: CsvEntityType, csvContent: string, context: CsvContextData, options?: { mode: 'APPEND' | 'UPDATE', inheritHierarchy?: boolean }): CsvImportResult => {
    try {
        // Extrair headers do CSV para validação
        const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) return { success: false, message: "Arquivo CSV vazio ou ilegível." };

        const separator = detectSeparator(lines[0]);
        const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));

        // Validar schema antes de processar
        const schemaValidation = validateCsvSchema(type, headers);
        if (!schemaValidation.valid) {
            return { success: false, message: schemaValidation.message };
        }

        const rawData = fromCSV(csvContent) as any[];
        if (rawData.length === 0) return { success: false, message: "CSV vazio (apenas cabeçalho, sem dados)." };

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
            const errors: string[] = [];

            rawData.forEach((r, i) => {
                // Strict Row Validation (Fix for empty Excel rows & placeholders)
                const sanitizeValue = (val: any): string => {
                    if (!val) return '';
                    let s = String(val).trim();
                    // Remove " or ' if that is the ONLY content (artifact of bad parsing)
                    if (s === '"' || s === "'" || s === '""' || s === "''") return '';
                    return s;
                };

                const startDate = parseDateString(r['Data/Hora Início']);
                const invalidDate = !startDate;

                const isInvalid = (val: any) => {
                    const s = sanitizeValue(val);
                    return s.length === 0 || s === '-' || s === '.' || s.toLowerCase() === 'n/a' || s === '0';
                };

                const statusName = sanitizeValue(r['Status']);
                let statusId = findTaxonomyId(taxonomy.triggerStatuses || [], statusName);
                if (!statusId) statusId = defaultStatusId;

                const areaName = sanitizeValue(r['AREA']);
                const equipName = sanitizeValue(r['Equip.']);
                const subName = sanitizeValue(r['Subconjunto']);

                let areaId = findAssetId(areaName, assets);
                let equipId = findAssetId(equipName, assets);
                let subId = findAssetId(subName, assets);

                // Hierarchy Inference (Task: Herdar Hierarquia)
                // If Subgroup is found but Area/Equip is missing, infer them from tree
                if (subId && (!areaId || !equipId)) {
                    const path = findAssetPath(assets, subId);
                    if (path) {
                        path.forEach(n => {
                            if (n.type === 'AREA' && !areaId) areaId = n.id;
                            if (n.type === 'EQUIPMENT' && !equipId) equipId = n.id;
                        });
                    }
                }
                // Same for Equipment -> Area
                if (equipId && !areaId) {
                    const path = findAssetPath(assets, equipId);
                    if (path) {
                        path.forEach(n => {
                            if (n.type === 'AREA' && !areaId) areaId = n.id;
                        });
                    }
                }

                // Validation moved after RCA inheritance
                const typeId = findTaxonomyId(taxonomy.analysisTypes || [], r['Tipo AF']);

                // Fix: Clean up ID AF if it contains placeholders like "-"
                const rawRcaId = String(r['ID AF'] || '').trim();
                const cleanRcaId = (rawRcaId && rawRcaId !== '-') ? rawRcaId : '';

                // --- LINKING LOGIC (Task 29.3 & 29.4) ---
                // Try to find the Linked RCA
                // Priority 1: ID Match
                let linkedRca = existingRecords.find(rec => rec.id === cleanRcaId);

                // Priority 2: File Path Match (Smart Correlation)
                // If no direct ID link, check if the file path matches the RCA's file path OR contains ID/OS
                if (!linkedRca && (r['Path'] || r['file_path'])) {
                    const rawPath = String(r['Path'] || r['file_path'] || '');

                    // Normalization: 
                    // 1. Replace backslashes with forward slashes
                    // 2. Remove double slashes
                    // 3. Lowercase for case-insensitive check
                    const normalize = (s: string) => s.replace(/\\/g, '/').replace(/\/\//g, '/').trim().toLowerCase();
                    const cleanPath = normalize(rawPath);

                    if (cleanPath.length > 5) { // Avoid matching short noise
                        // Search for Matching RCA
                        linkedRca = existingRecords.find(rec => {
                            if (!rec.id) return false;

                            // 1. EXACT PATH MATCH (Highest Priority)
                            if (rec.file_path) {
                                const cleanRcaPath = normalize(rec.file_path);
                                // Check exact match or if one ends with the other (handling relative vs absolute)
                                if (cleanRcaPath === cleanPath || cleanPath.endsWith(cleanRcaPath) || cleanRcaPath.endsWith(cleanPath)) {
                                    return true;
                                }
                            }

                            // 2. Check ID in Path
                            const cleanId = normalize(rec.id);
                            if (cleanPath.includes(cleanId)) return true;

                            // 3. Check OS Number in Path (Common in filenames)
                            if (rec.os_number) {
                                const cleanOs = normalize(rec.os_number);
                                if (cleanOs.length > 2 && cleanPath.includes(cleanOs)) return true;
                            }

                            return false;
                        });

                        if (linkedRca) {
                            console.log(`🔗 Smart Link Success: "${rawPath}" -> RCA ${linkedRca.id}`);
                        }
                    }
                }

                // --- HIERARCHY INHERITANCE ---
                // If Trigger has missing hierarchy OR inheritHierarchy option is true, inherit from RCA
                if (linkedRca) {
                    const shouldInherit = options?.inheritHierarchy || false;

                    if ((shouldInherit || !areaId) && linkedRca.area_id) areaId = linkedRca.area_id;
                    if ((shouldInherit || !equipId) && linkedRca.equipment_id) equipId = linkedRca.equipment_id;
                    if ((shouldInherit || !subId) && linkedRca.subgroup_id) subId = linkedRca.subgroup_id;

                    // Auto-fill RCA ID if found by path
                    if (!cleanRcaId) {
                        // We don't overwrite r['ID AF'] here but we use linkedRca.id for the object
                    }
                }


                // Strict Validation with Error Reporting
                // We check areaId here, instead of raw string
                if (invalidDate) {
                    errors.push(`Row ${i + 1}: Invalid Date format ('${r['Data/Hora Início'] || ''}')`);
                    return;
                }
                if (!areaId) {
                    errors.push(`Row ${i + 1}: Missing Area and could not inherit from linked RCA (Subgroup: '${subName}', path connection failed)`);
                    return;
                }

                // Determine ID based on Mode
                let triggerId = generateId('TRG');
                if (options?.mode === 'UPDATE' && r['ID']) {
                    // Update Mode: Use provided ID if present (Upsert behavior)
                    triggerId = r['ID'];
                }

                const trigger: TriggerRecord = {
                    id: triggerId,
                    area_id: areaId,
                    equipment_id: equipId,
                    subgroup_id: subId,
                    start_date: startDate, // Use parsed date directly
                    end_date: parseDateString(r['Data/Hora Fim']),
                    duration_minutes: parseInt(r['Duração (min)']) || 0,
                    stop_type: r['Tipo Parada'] || '',
                    stop_reason: r['Razão Parada'] || '',
                    comments: r['Comentários'] || '',
                    analysis_type_id: typeId,
                    status: statusId,
                    responsible: r['Responsável'] || '',
                    rca_id: linkedRca ? linkedRca.id : '', // Only use validated ID from lookup
                    file_path: r['Path'] || r['Caminho'] || r['Link'] || r['File Path'] || ''
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
                        analysis_duration_minutes: Number(r.analysis_duration_minutes) || existingRec.analysis_duration_minutes,
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
            const newItems: TaxonomyItem[] = rawData.map(r => {
                const item: TaxonomyItem = {
                    id: r.id || generateId('TAX'),
                    name: r.name || 'Unnamed Item'
                };

                // Handle Specialty IDs for Failure Modes
                if (type === 'TAXONOMY_FAILURE_MODES' && r.specialty_ids) {
                    const rawIds = String(r.specialty_ids);
                    if (rawIds.trim()) {
                        item.specialty_ids = rawIds.split(/[|;]/).map(id => id.trim()).filter(id => id);
                    }
                }

                return item;
            });

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
