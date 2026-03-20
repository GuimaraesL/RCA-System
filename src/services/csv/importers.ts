
/**
 * Proposta: Lógica de importação de dados a partir de arquivos CSV.
 * Fluxo: Implementa a leitura e normalização de arquivos CSV, validando schemas, convertendo tipos de dados (datas, números) e reconstruindo hierarquias de ativos e vínculos entre entidades.
 */

import { fromCSV, detectSeparator } from "../../utils/csvUtils";
import { parseDateString } from "../../utils/parsingUtils";
import { generateId, isStandardId, TAXONOMY_PREFIXES } from "../api/base";
import { findAssetPath } from "../../utils/triggerHelpers";
import { AssetNode, ActionRecord, TaxonomyItem, TriggerRecord } from "../../types";
import { CsvContextData, CsvEntityType, CsvImportResult, REQUIRED_HEADERS, TAXONOMY_MAP } from "./types";

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

                let fiveWhysChains: any[] = [];
                if (r.five_whys_chains) {
                    try {
                        const parsed = JSON.parse(r.five_whys_chains);
                        fiveWhysChains = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        console.warn('Falha ao processar five_whys_chains JSON:', e);
                    }
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
                    five_whys_chains: fiveWhysChains,
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
                const prefix = TAXONOMY_PREFIXES[taxonomyKey as keyof typeof TAXONOMY_PREFIXES] || 'TAX';
                // Força a padronização: se o ID fornecido não for padrão, geramos um novo
                const id = (r.id && isStandardId(r.id, prefix)) ? r.id : generateId(prefix);
                const item: TaxonomyItem = { id, name: r.name || 'Item sem nome' };
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
