/**
 * Proposta: Serviço de processamento, exportação e importação de arquivos delimitados (CSV).
 * Fluxo: Gerencia a conversão entre objetos complexos do sistema e linhas planas de texto, garantindo a integridade dos dados técnicos (5W, Ishikawa, 6M) e tratando variações de localidade (ponto vs vírgula).
 */

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

// --- VALIDAÇÃO DE SCHEMA ---
// Mapa de colunas obrigatórias para garantir a integridade mínima de cada entidade
const REQUIRED_HEADERS: Record<CsvEntityType, string[]> = {
    'ASSETS': ['name', 'type'], 
    'ACTIONS': ['action', 'responsible'], 
    'TRIGGERS': ['AREA', 'Equip.', 'Data/Hora Início'], 
    'RECORDS_SUMMARY': ['id'], 
    'TAXONOMY_ANALYSIS_TYPES': ['name'],
    'TAXONOMY_STATUSES': ['name'],
    'TAXONOMY_SPECIALTIES': ['name'],
    'TAXONOMY_FAILURE_MODES': ['name', 'specialty_ids'], 
    'TAXONOMY_FAILURE_CATEGORIES': ['name'],
    'TAXONOMY_COMPONENT_TYPES': ['name'],
    'TAXONOMY_ROOT_CAUSE_MS': ['name'],
    'TAXONOMY_TRIGGER_STATUSES': ['name']
};

/**
 * Valida se o CSV possui as colunas fundamentais para o processamento.
 */
const validateCsvSchema = (type: CsvEntityType, headers: string[]): { valid: boolean, message: string } => {
    const required = REQUIRED_HEADERS[type];
    if (!required) return { valid: true, message: '' };

    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
    const missing = required.filter(r => !normalizedHeaders.includes(r.toLowerCase()));

    if (missing.length > 0) {
        return {
            valid: false,
            message: `Schema inválido para ${type}. Colunas obrigatórias faltando: [${missing.join(', ')}].`
        };
    }
    return { valid: true, message: '' };
};

// --- AUXILIARES DE PARSING ---

/**
 * Converte strings de data (incluindo formatos do Excel) para ISO String.
 * Suporta datas seriais do Excel e formato padrão DD/MM/YYYY HH:mm.
 */
const parseDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const cleanStr = String(dateStr).trim();

        // 1. Detecção de Data Serial do Excel (ex: "45848")
        if (/^\d+([.,]\d+)?$/.test(cleanStr)) {
            const serial = parseFloat(cleanStr.replace(',', '.'));
            if (!isNaN(serial) && serial > 20000) {
                const utcDays = Math.floor(serial - 25569);
                const utcValue = utcDays * 86400; 
                const dateInfo = new Date(utcValue * 1000);

                const fractionalDay = serial - Math.floor(serial) + 0.0000001;
                const totalSeconds = Math.floor(86400 * fractionalDay);

                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                dateInfo.setUTCHours(hours, minutes, seconds);
                return dateInfo.toISOString();
            }
        }

        // 2. Formatos Padrão (DD/MM/YYYY)
        const parts = cleanStr.split(' ');
        const dateParts = parts[0].split('/');

        if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];

            if (parseInt(month) > 12 || parseInt(day) > 31) return '';

            const time = parts[1] || '00:00';
            return `${year}-${month}-${day}T${time}`;
        }

        // 3. Fallback: Construtor nativo do Date
        const fallback = new Date(cleanStr);
        if (!isNaN(fallback.getTime())) {
            return fallback.toISOString();
        }

        return '';
    } catch (e) {
        console.warn('Falha ao processar data:', dateStr, e);
        return '';
    }
};

/**
 * Serializa array de objetos para string CSV.
 * Utiliza ponto e vírgula como delimitador para garantir compatibilidade com Excel em PT-BR.
 */
const toCSV = (data: any[], headers: string[]): string => {
    const headerRow = headers.join(';'); 
    const rows = data.map(row => {
        return headers.map(fieldName => {
            let val = row[fieldName];
            
            // Tratamento de Arrays internos (ex: participantes)
            if (Array.isArray(val)) {
                val = val.join('|'); 
            } else if (val === undefined || val === null) {
                val = '';
            }

            let stringVal = String(val);

            // Prevenção de CSV Injection / Formula Injection
            if (/^[=+\-@]/.test(stringVal)) {
                stringVal = "'" + stringVal;
            }

            // Escapa aspas e envolve em aspas duplas se contiver delimitador ou quebra de linha
            if (stringVal.includes(';') || stringVal.includes('"') || stringVal.includes('\n')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        }).join(';');
    });
    return [headerRow, ...rows].join('\n');
};

/**
 * Detecta o separador mais provável (vírgula ou ponto e vírgula).
 */
const detectSeparator = (headerLine: string): string => {
    const commas = (headerLine.match(/,/g) || []).length;
    const semicolons = (headerLine.match(/;/g) || []).length;
    return semicolons >= commas ? ';' : ',';
};

/**
 * Parser de CSV robusto capaz de lidar com campos multi-linha e aspas escapadas.
 */
const fromCSV = (csv: string): any[] => {
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
                currentVal += '"';
                i++;
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === separator && !insideQuote) {
            currentRow.push(currentVal);
            currentVal = '';
        } else if ((char === '\r' || char === '\n') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentVal);
            if (currentRow.length > 0 && currentRow.some(c => c.trim().length > 0)) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    if (currentRow.length > 0 || currentVal !== '') {
        currentRow.push(currentVal);
        if (currentRow.some(c => c.trim().length > 0)) {
            rows.push(currentRow);
        }
    }

    if (rows.length === 0) return [];

    const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, '')); 
    const dataRows = rows.slice(1);

    return dataRows.map(rowValues => {
        const obj: any = {};
        headers.forEach((h, index) => {
            const val = rowValues[index] || '';
            obj[h] = val.trim();
        });
        return obj;
    });
};

// --- GERADORES DE EXPORTAÇÃO (EXPORTERS) ---

export const getCsvTemplate = (type: CsvEntityType): string => {
    switch (type) {
        case 'ASSETS': return 'id;name;type;parentId';
        case 'ACTIONS': return 'id;rca_id;action;responsible;date;status;moc_number';
        case 'TRIGGERS': return 'ID;AREA;Equip.;Subconjunto;Data/Hora Início;Data/Hora Fim;Duração (min);Tipo Parada;Razão Parada;Comentários;Tipo AF;Status;Responsável;ID AF;Path';
        case 'RECORDS_SUMMARY': return 'id;what;issue_description;analysis_type;status;failure_date;failure_time;downtime_minutes;analysis_duration_minutes;financial_impact;area_id;equipment_id;subgroup_id;component_type;who;when;where_description;problem_description;participants;root_causes;five_whys;ishikawa;potential_impacts;lessons_learned;version;file_path;specialty_id;failure_mode_id;failure_category_id';
        default: return 'id;name';
    }
};

export const exportToCsv = (type: CsvEntityType, context: CsvContextData): string => {
    const { assets = [], actions = [], triggers = [], records = [], taxonomy = { analysisTypes: [], analysisStatuses: [], specialties: [], failureModes: [], failureCategories: [], componentTypes: [], rootCauseMs: [], triggerStatuses: [] } } = context;

    if (type === 'ASSETS') {
        const flatAssets: any[] = [];
        const traverse = (nodes: AssetNode[], currentParentId: string | null) => {
            nodes.forEach(n => {
                flatAssets.push({ id: n.id, name: n.name, type: n.type, parentId: currentParentId });
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
        const rows = triggers.map(t => ({
            'ID': t.id, 'AREA': t.area_id, 'Equip.': t.equipment_id, 'Subconjunto': t.subgroup_id,
            'Data/Hora Início': t.start_date, 'Data/Hora Fim': t.end_date, 'Duração (min)': t.duration_minutes,
            'Tipo Parada': t.stop_type, 'Razão Parada': t.stop_reason, 'Comentários': t.comments,
            'Tipo AF': t.analysis_type_id, 'Status': t.status, 'Responsável': t.responsible,
            'ID AF': t.rca_id, 'Path': t.file_path || ''
        }));
        return toCSV(rows, ['AREA', 'Equip.', 'Subconjunto', 'Data/Hora Início', 'Data/Hora Fim', 'Duração (min)', 'Tipo Parada', 'Razão Parada', 'Comentários', 'Tipo AF', 'Status', 'Responsável', 'ID AF', 'Path']);
    }

    if (type === 'RECORDS_SUMMARY') {
        const header = ['id', 'what', 'problem_description', 'analysis_type', 'status', 'failure_date', 'failure_time', 'downtime_minutes', 'analysis_duration_minutes', 'financial_impact', 'area_id', 'equipment_id', 'subgroup_id', 'component_type', 'who', 'when', 'where_description', 'participants', 'root_causes', 'five_whys', 'ishikawa', 'potential_impacts', 'lessons_learned', 'version', 'file_path', 'specialty_id', 'failure_mode_id', 'failure_category_id', 'analysis_date', 'facilitator', 'os_number'];

        const rows = records.map(r => {
            const joinList = (val: any) => Array.isArray(val) ? val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('|') : String(val || '');
            
            // Serialização técnica para transporte via CSV (preserva integridade do motor de status)
            // Usa '|| ""' para evitar 'undefined' na string resultante
            const rootCauses = Array.isArray(r.root_causes) ? r.root_causes.map(rc => `${rc.root_cause_m_id || ''}:${rc.cause || ''}`).join('|') : '';
            const fiveWhys = Array.isArray(r.five_whys) ? r.five_whys.map(w => `${w.why_question || ''}:${w.answer || ''}`).join('|') : '';
            const ishikawa = r.ishikawa ? Object.entries(r.ishikawa).flatMap(([cat, items]) => (Array.isArray(items) ? items : []).map(item => `${cat}:${item}`)).join('|') : '';

            return {
                ...r,
                participants: joinList(r.participants),
                root_causes: rootCauses,
                five_whys: fiveWhys,
                ishikawa: ishikawa,
                potential_impacts: joinList(r.potential_impacts),
                lessons_learned: joinList(r.lessons_learned)
            };
        });

        return toCSV(rows, header);
    }

    const taxonomyKey = TAXONOMY_MAP[type];
    if (taxonomyKey && taxonomy) {
        const items = (taxonomy[taxonomyKey] as TaxonomyItem[]) || [];
        if (type === 'TAXONOMY_FAILURE_MODES') {
            const rows = items.map((i: any) => ({ id: i.id, name: i.name, specialty_ids: i.specialty_ids ? i.specialty_ids.join('|') : '' }));
            return toCSV(rows, ['id', 'name', 'specialty_ids']);
        }
        return toCSV(items, ['id', 'name']);
    }

    return '';
};

// --- PROCESSADORES DE IMPORTAÇÃO (IMPORTERS) ---

export const importFromCsv = (type: CsvEntityType, csvContent: string, context: CsvContextData, options: { mode: 'APPEND' | 'UPDATE', inheritHierarchy?: boolean } = { mode: 'APPEND', inheritHierarchy: true }): CsvImportResult => {
    try {
        const inherit = options.inheritHierarchy !== false; // Default para true se não for explicitamente false
        const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) return { success: false, message: "Arquivo CSV vazio ou ilegível." };

        const separator = detectSeparator(lines[0]);
        const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));

        const schemaValidation = validateCsvSchema(type, headers);
        if (!schemaValidation.valid) return { success: false, message: schemaValidation.message };

        const rawData = fromCSV(csvContent) as any[];
        if (rawData.length === 0) return { success: false, message: "CSV sem dados." };

        const { assets = [], taxonomy = { analysisTypes: [], analysisStatuses: [], specialties: [], failureModes: [], failureCategories: [], componentTypes: [], rootCauseMs: [], triggerStatuses: [] }, triggers: existingTriggers = [], actions: existingActions = [], records: existingRecords = [] } = context;

        if (type === 'ASSETS') {
            const nodes: AssetNode[] = rawData.map(r => ({
                id: r.id || generateId('IMP'),
                name: r.name || 'Ativo sem nome',
                type: (r.type === 'AREA' || r.type === 'EQUIPMENT' || r.type === 'SUBGROUP') ? r.type : 'AREA',
                parentId: r.parentId || undefined,
                children: []
            }));

            const nodeMap = new Map<string, AssetNode>();
            nodes.forEach(n => nodeMap.set(n.id, n));
            const rootNodes: AssetNode[] = [];

            nodes.forEach(n => {
                if (n.parentId && nodeMap.has(n.parentId)) {
                    const parent = nodeMap.get(n.parentId)!;
                    parent.children = parent.children || [];
                    parent.children.push(n);
                } else {
                    rootNodes.push(n);
                }
            });

            return { success: true, message: `${nodes.length} ativos processados com sucesso.`, data: rootNodes, dataType: 'ASSETS' };
        }

        if (type === 'TRIGGERS') {
            const newTriggers: TriggerRecord[] = [];
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

            const findTaxonomyId = (list: TaxonomyItem[], name: string): string => {
                if (!name) return '';
                const found = list.find(i => i.name.toLowerCase() === name.toLowerCase().trim() || i.id === name);
                return found ? found.id : '';
            };

            const defaultStatusId = taxonomy.triggerStatuses?.[0]?.id || 'TRG-ST-01';
            const errors: string[] = [];

            rawData.forEach((r, i) => {
                const sanitizeValue = (val: any): string => {
                    if (!val) return '';
                    let s = String(val).trim();
                    // Trata aspas e o caractere de traço (comum em exports de Excel) como vazio
                    if (s === '"' || s === "'" || s === '""' || s === "''" || s === "-") return '';
                    return s;
                };

                const startDate = parseDateString(r['Data/Hora Início']);
                if (!startDate) {
                    errors.push(`Linha ${i + 1}: Data de início inválida.`);
                    return;
                }

                const statusName = sanitizeValue(r['Status']);
                let statusId = findTaxonomyId(taxonomy.triggerStatuses || [], statusName) || defaultStatusId;

                const areaName = sanitizeValue(r['AREA']);
                const equipName = sanitizeValue(r['Equip.']);
                const subName = sanitizeValue(r['Subconjunto']);

                let areaId = findAssetId(areaName, assets);
                let equipId = findAssetId(equipName, assets);
                let subId = findAssetId(subName, assets);

                // Inferência de Hierarquia: Completa automaticamente se um nível inferior for identificado
                if (subId && (!areaId || !equipId)) {
                    const path = findAssetPath(assets, subId);
                    if (path) {
                        path.forEach(n => {
                            if (n.type === 'AREA' && !areaId) areaId = n.id;
                            if (n.type === 'EQUIPMENT' && !equipId) equipId = n.id;
                        });
                    }
                }

                const typeId = findTaxonomyId(taxonomy.analysisTypes || [], r['Tipo AF']);
                const rawRcaId = String(r['ID AF'] || '').trim();
                const cleanRcaId = (rawRcaId && rawRcaId !== '-') ? rawRcaId : '';

                // Lógica de Vinculação Inteligente (ID ou Caminho de Arquivo)
                let linkedRca = existingRecords.find(rec => rec.id === cleanRcaId);
                if (!linkedRca && (r['Path'] || r['file_path'])) {
                    const rawPath = String(r['Path'] || r['file_path'] || '');
                    const normalize = (s: string) => s.replace(/\\/g, '/').replace(/\/\//g, '/').trim().toLowerCase();
                    const cleanPath = normalize(rawPath);

                    if (cleanPath.length > 5) {
                        linkedRca = existingRecords.find(rec => {
                            if (!rec.id) return false;
                            if (rec.file_path && normalize(rec.file_path) === cleanPath) return true;
                            if (normalize(rec.id).includes(cleanPath)) return true;
                            return false;
                        });
                    }
                }

                // Herança de Hierarquia: Se o usuário optou por herdar e temos uma RCA vinculada,
                // preenchemos os IDs de ativos faltantes ou inválidos com os dados da RCA.
                if (inherit && linkedRca) {
                    if (!areaId && linkedRca.area_id) areaId = linkedRca.area_id;
                    if (!equipId && linkedRca.equipment_id) equipId = linkedRca.equipment_id;
                    if (!subId && linkedRca.subgroup_id) subId = linkedRca.subgroup_id;
                }

                if (!areaId) {
                    errors.push(`Linha ${i + 1}: Área não identificada.`);
                    return;
                }

                let triggerId = (options?.mode === 'UPDATE' && r['ID']) ? r['ID'] : generateId('TRG');

                const trigger: TriggerRecord = {
                    id: triggerId,
                    area_id: areaId,
                    equipment_id: equipId,
                    subgroup_id: subId,
                    start_date: startDate,
                    end_date: parseDateString(r['Data/Hora Fim']),
                    duration_minutes: parseInt(r['Duração (min)']) || 0,
                    stop_type: r['Tipo Parada'] || '',
                    stop_reason: r['Razão Parada'] || '',
                    comments: r['Comentários'] || '',
                    analysis_type_id: typeId,
                    status: statusId,
                    responsible: r['Responsável'] || '',
                    rca_id: linkedRca ? linkedRca.id : '',
                    file_path: r['Path'] || r['Caminho'] || r['Link'] || r['File Path'] || ''
                };
                newTriggers.push(trigger);
            });

            return { success: true, message: `${newTriggers.length} gatilhos importados com sucesso.`, data: [...existingTriggers, ...newTriggers], dataType: 'TRIGGERS' };
        }

        if (type === 'ACTIONS') {
            const actions: ActionRecord[] = rawData.map(r => ({
                id: r.id || generateId('ACT'),
                rca_id: r.rca_id || '',
                action: r.action || 'Nova Ação',
                responsible: r.responsible || '',
                date: r.date || new Date().toISOString().split('T')[0],
                status: ['1', '2', '3', '4'].includes(r.status) ? r.status : '1',
                moc_number: r.moc_number || ''
            }));

            const actionMap = new Map(existingActions.map(a => [a.id, a]));
            actions.forEach(a => actionMap.set(a.id, a));
            return { success: true, message: `${actions.length} ações processadas.`, data: Array.from(actionMap.values()), dataType: 'ACTIONS' };
        }

        if (type === 'RECORDS_SUMMARY') {
            const recordMap = new Map(existingRecords.map(r => [r.id, r]));
            let updatedCount = 0;

            const importedRecords = rawData.map(r => {
                let parts: string[] = [];
                if (r.participants) {
                    parts = r.participants.split('|').map((p: string) => p.trim()).filter((p: string) => p);
                }

                // Desserialização técnica para reconstrução dos objetos complexos
                let rootCauses: any[] = [];
                if (r.root_causes) {
                    rootCauses = r.root_causes.split('|').map((pair: string) => {
                        const [m_id, ...causeParts] = pair.split(':');
                        return { id: generateId('RC'), root_cause_m_id: m_id, cause: causeParts.join(':') };
                    }).filter((rc: any) => rc.root_cause_m_id && rc.cause);
                }

                let fiveWhys: any[] = [];
                if (r.five_whys) {
                    fiveWhys = r.five_whys.split('|').map((pair: string, idx: number) => {
                        const [q, ...aParts] = pair.split(':');
                        return { id: String(idx + 1), why_question: q, answer: aParts.join(':') };
                    }).filter((w: any) => w.answer);
                }

                let ishikawa: any = { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] };
                if (r.ishikawa) {
                    r.ishikawa.split('|').forEach((pair: string) => {
                        const [cat, ...itemParts] = pair.split(':');
                        if (ishikawa[cat]) ishikawa[cat].push(itemParts.join(':'));
                    });
                }

                const parseNum = (val: any) => {
                    if (!val) return 0;
                    const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
                    const num = parseFloat(clean);
                    return isNaN(num) ? 0 : num;
                };

                const rec = {
                    id: r.id,
                    what: r.what,
                    problem_description: r.problem_description,
                    analysis_type: r.analysis_type,
                    status: r.status,
                    failure_date: r.failure_date,
                    failure_time: r.failure_time,
                    downtime_minutes: parseNum(r.downtime_minutes),
                    financial_impact: parseNum(r.financial_impact),
                    analysis_duration_minutes: parseNum(r.analysis_duration_minutes),
                    area_id: r.area_id,
                    equipment_id: r.equipment_id,
                    subgroup_id: r.subgroup_id,
                    component_type: r.component_type,
                    who: r.who,
                    when: r.when,
                    where_description: r.where_description,
                    participants: parts,
                    root_causes: rootCauses,
                    five_whys: fiveWhys,
                    ishikawa: ishikawa,
                    potential_impacts: r.potential_impacts || '',
                    quality_impacts: r.quality_impacts || '',
                    lessons_learned: r.lessons_learned ? r.lessons_learned.split('|') : [],
                    version: r.version || '17.0',
                    file_path: r.file_path,
                    specialty_id: r.specialty_id,
                    failure_mode_id: r.failure_mode_id,
                    failure_category_id: r.failure_category_id,
                    analysis_date: r.analysis_date,
                    facilitator: r.facilitator,
                    os_number: r.os_number
                };

                if (recordMap.has(rec.id)) updatedCount++;
                return rec;
            });

            return { success: true, message: `${importedRecords.length} análises processadas (${updatedCount} atualizações).`, data: importedRecords, dataType: 'RECORDS_SUMMARY' };
        }

        const taxonomyKey = TAXONOMY_MAP[type];
        if (taxonomyKey) {
            const newItems: TaxonomyItem[] = rawData.map(r => {
                const item: TaxonomyItem = { id: r.id || generateId('TAX'), name: r.name || 'Item sem nome' };
                if (type === 'TAXONOMY_FAILURE_MODES' && r.specialty_ids) {
                    item.specialty_ids = String(r.specialty_ids).split(/[|;]/).map(id => id.trim()).filter(id => id);
                }
                return item;
            });

            const currentTaxonomy = { ...taxonomy };
            if (taxonomyKey in currentTaxonomy) {
                // @ts-ignore
                currentTaxonomy[taxonomyKey] = newItems;
            }
            return { success: true, message: `${newItems.length} itens da taxonomia ${taxonomyKey} atualizados.`, data: currentTaxonomy, dataType: type };
        }

        return { success: false, message: "Tipo de entidade desconhecido." };

    } catch (e) {
        console.error(e);
        return { success: false, message: "Erro crítico no parsing do CSV." };
    }
};