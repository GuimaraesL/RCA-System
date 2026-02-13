
import { toCSV } from "../../utils/csvUtils";
import { AssetNode, TaxonomyItem } from "../../types";
import { CsvContextData, CsvEntityType, TAXONOMY_MAP } from "./types";

export const getCsvTemplate = (type: CsvEntityType): string => {
    switch (type) {
        case 'ASSETS': return 'id;name;type;parentId';
        case 'ACTIONS': return 'id;rca_id;action;responsible;date;status;moc_number';
        case 'TRIGGERS': return 'ID;AREA;Equip.;Subconjunto;Data/Hora Início;Data/Hora Fim;Duração (min);Tipo Parada;Razão Parada;Comentários;Tipo AF;Status;Responsável;ID AF;Path';
        case 'RECORDS_SUMMARY': return 'id;what;issue_description;analysis_type;status;failure_date;failure_time;downtime_minutes;analysis_duration_minutes;financial_impact;area_id;equipment_id;subgroup_id;component_type;who;when;where_description;problem_description;participants;root_causes;five_whys;five_whys_chains;ishikawa;potential_impacts;lessons_learned;version;file_path;specialty_id;failure_mode_id;failure_category_id';
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
        const header = ['id', 'what', 'problem_description', 'analysis_type', 'status', 'failure_date', 'failure_time', 'downtime_minutes', 'analysis_duration_minutes', 'financial_impact', 'area_id', 'equipment_id', 'subgroup_id', 'component_type', 'who', 'when', 'where_description', 'participants', 'root_causes', 'five_whys', 'five_whys_chains', 'ishikawa', 'potential_impacts', 'lessons_learned', 'version', 'file_path', 'specialty_id', 'failure_mode_id', 'failure_category_id', 'analysis_date', 'facilitator', 'os_number'];

        const rows = records.map(r => {
            const joinList = (val: any) => Array.isArray(val) ? val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('|') : String(val || '');
            
            const rootCauses = Array.isArray(r.root_causes) ? r.root_causes.map(rc => `${rc.root_cause_m_id || ''}:${rc.cause || ''}`).join('|') : '';
            const fiveWhys = Array.isArray(r.five_whys) ? r.five_whys.map(w => `${w.why_question || ''}:${w.answer || ''}`).join('|') : '';
            const ishikawa = r.ishikawa ? Object.entries(r.ishikawa).flatMap(([cat, items]) => (Array.isArray(items) ? items : []).map(item => `${cat}:${item}`)).join('|') : '';
            const fiveWhysChains = r.five_whys_chains ? JSON.stringify(r.five_whys_chains) : '';

            return {
                ...r,
                participants: joinList(r.participants),
                root_causes: rootCauses,
                five_whys: fiveWhys,
                five_whys_chains: fiveWhysChains,
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
