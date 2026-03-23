/**
 * Proposta: Repositório SQL para persistência e consulta de registros de RCA.
 * Fluxo: Gerencia a tradução entre objetos JavaScript complexos (contendo arrays/objetos JSON) e colunas de texto do SQLite,
 *        distribuída entre as tabelas `rcas`, `rca_investigations` e `rcas_attachments`.
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { Rca } from '../../domain/types/RcaTypes';
import { randomUUID } from 'crypto';
import { logger } from '../logger';

 

const CONTAINMENT_MAP = {
    containment_actions: 'CONTAINMENT_ACTIONS',
    lessons_learned: 'LESSONS_LEARNED'
};

const ISHIKAWA_ID_MAP: Record<string, string> = {
    manpower: 'M1',
    method: 'M2',
    material: 'M3',
    machine: 'M4',
    environment: 'M5',
    measurement: 'M6'
};

const ISHIKAWA_REV_MAP: Record<string, string> = {
    'M1': 'manpower',
    'M2': 'method',
    'M3': 'material',
    'M4': 'machine',
    'M5': 'environment',
    'M6': 'measurement'
};

export class SqlRcaRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    /**
     * Retorna a carga total de todos os registros.
     * Uso: Backups, Exportações Integrais.
     */
    public findAll(): Rca[] {
        const rows = this.db.query('SELECT * FROM rcas ORDER BY created_at DESC');
        const rcas = rows.map(this.mapRowToRca);

        const allAtt = this.db.query('SELECT * FROM rcas_attachments');
        const attByRca = new Map<string, any[]>();
        allAtt.forEach(att => {
            if (!attByRca.has(att.rca_id)) attByRca.set(att.rca_id, []);
            attByRca.get(att.rca_id)?.push(this.mapAttachmentRow(att));
        });
        
        return rcas.map(rca => {
            const fiveWhys = this.db.query('SELECT * FROM rca_five_whys WHERE rca_id = ? ORDER BY order_index ASC', [rca.id]);
            const ishikawa = this.db.query('SELECT * FROM rca_ishikawa WHERE rca_id = ?', [rca.id]);
            const rootCauses = this.db.query('SELECT * FROM rca_root_causes WHERE rca_id = ?', [rca.id]);
            const precision = this.db.query('SELECT * FROM rca_precision_checklists WHERE rca_id = ?', [rca.id])[0] || null;
            const hra = this.db.query('SELECT * FROM rca_hra_checklists WHERE rca_id = ?', [rca.id])[0] || null;
            const containments = this.db.query('SELECT content FROM rca_containment WHERE rca_id = ?', [rca.id]);
            
            this.enrichRca(rca, fiveWhys, ishikawa, rootCauses, precision, hra, containments);
            rca.attachments = attByRca.get(rca.id) || [];
            return rca;
        });
    }

    /**
     * Retorna uma visão resumida dos registros (exclui blobs pesados de investigação).
     * Uso: Listagem principal e Dashboard para economia de recursos e performance.
     */
    public findAllSummary(): Rca[] {
        const sql = `
            SELECT 
                id, version, analysis_date, analysis_duration_minutes, analysis_type, status,
                participants, facilitator, start_date, completion_date, requires_operation_support,
                failure_date, failure_time, downtime_minutes, financial_impact, os_number,
                area_id, equipment_id, subgroup_id, component_type, asset_name_display,
                specialty_id, failure_mode_id, failure_category_id,
                who, what, "when", where_description, problem_description, 
                created_at, updated_at
            FROM rcas 
            ORDER BY created_at DESC
        `;
        const rows = this.db.query(sql);
        const rcas = rows.map(this.mapRowToRca);

        const ids = rcas.map(r => r.id);
        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            
            // O Dashboard consome "rootCause6Ms" do array "root_causes", por isso trazemos esta relação resumida.
            const rcRows = this.db.query(`SELECT rca_id, id, root_cause_m_id, cause FROM rca_root_causes WHERE rca_id IN (${placeholders})`, ids);
            const rcByRca = new Map<string, any[]>();
            rcRows.forEach(rc => {
                if (!rcByRca.has(rc.rca_id)) rcByRca.set(rc.rca_id, []);
                rcByRca.get(rc.rca_id)?.push({
                    id: rc.id,
                    root_cause_m_id: rc.root_cause_m_id,
                    cause: rc.cause
                });
            });

            const attRows = this.db.query(`SELECT * FROM rcas_attachments WHERE rca_id IN (${placeholders})`, ids);
            const attByRca = new Map<string, any[]>();
            attRows.forEach(att => {
                if (!attByRca.has(att.rca_id)) attByRca.set(att.rca_id, []);
                attByRca.get(att.rca_id)?.push(this.mapAttachmentRow(att));
            });

            rcas.forEach(rca => {
                rca.root_causes = rcByRca.get(rca.id) || [];
                rca.attachments = attByRca.get(rca.id) || [];
            });
        }

        return rcas;
    }

    public findAllPaginated(page: number, limit: number): { data: Rca[], total: number } {
        const offset = (page - 1) * limit;

        // 1. Recupera contagem total para orquestração da paginação
        const countResult = this.db.query('SELECT COUNT(*) as total FROM rcas');
        const total = countResult[0]?.total || 0;

        // 2. Recupera fatia de dados (Lazy Load)
        const rows = this.db.query('SELECT * FROM rcas ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
        const data = rows.map(this.mapRowToRca);

        // 3. Carrega sub-recursos apenas para os itens da página
        const ids = data.map(r => r.id);
        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            
            // Investigações (Analyses, Checklists, Containments)
            const fiveWhysRows = this.db.query(`SELECT * FROM rca_five_whys WHERE rca_id IN (${placeholders}) ORDER BY order_index ASC`, ids);
            const ishiRows = this.db.query(`SELECT * FROM rca_ishikawa WHERE rca_id IN (${placeholders})`, ids);
            const rootsRows = this.db.query(`SELECT * FROM rca_root_causes WHERE rca_id IN (${placeholders})`, ids);
            const precisionRows = this.db.query(`SELECT * FROM rca_precision_checklists WHERE rca_id IN (${placeholders})`, ids);
            const hraRows = this.db.query(`SELECT * FROM rca_hra_checklists WHERE rca_id IN (${placeholders})`, ids);
            const containmentRows = this.db.query(`SELECT rca_id, content FROM rca_containment WHERE rca_id IN (${placeholders})`, ids);

            const mapByRcaArray = (rows: any[]) => {
                const map = new Map<string, any[]>();
                rows.forEach(r => {
                    if (!map.has(r.rca_id)) map.set(r.rca_id, []);
                    map.get(r.rca_id)?.push(r);
                });
                return map;
            };

            const mapByRcaSingle = (rows: any[]) => {
                const map = new Map<string, any>();
                rows.forEach(r => map.set(r.rca_id, r));
                return map;
            };

            const fwhysByRca = mapByRcaArray(fiveWhysRows);
            const ishiByRca = mapByRcaArray(ishiRows);
            const rootsByRca = mapByRcaArray(rootsRows);
            const precisionByRca = mapByRcaSingle(precisionRows);
            const hraByRca = mapByRcaSingle(hraRows);
            const containmentByRca = mapByRcaArray(containmentRows);

            // Anexos
            const attRows = this.db.query(`SELECT * FROM rcas_attachments WHERE rca_id IN (${placeholders})`, ids);
            const attByRca = new Map<string, any[]>();
            attRows.forEach(att => {
                if (!attByRca.has(att.rca_id)) attByRca.set(att.rca_id, []);
                attByRca.get(att.rca_id)?.push(this.mapAttachmentRow(att));
            });

            data.forEach(rca => {
                this.enrichRca(
                    rca, 
                    fwhysByRca.get(rca.id) || [],
                    ishiByRca.get(rca.id) || [],
                    rootsByRca.get(rca.id) || [],
                    precisionByRca.get(rca.id) || null,
                    hraByRca.get(rca.id) || null,
                    containmentByRca.get(rca.id) || []
                );
                rca.attachments = attByRca.get(rca.id) || [];
            });
        }

        return { data, total };
    }

    public findById(id: string): Rca | null {
        const rows = this.db.query('SELECT * FROM rcas WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        
        const rca = this.mapRowToRca(rows[0]);
        
        const fiveWhys = this.db.query('SELECT * FROM rca_five_whys WHERE rca_id = ? ORDER BY order_index ASC', [id]);
        const ishikawa = this.db.query('SELECT * FROM rca_ishikawa WHERE rca_id = ?', [id]);
        const rootCauses = this.db.query('SELECT * FROM rca_root_causes WHERE rca_id = ?', [id]);
        const precision = this.db.query('SELECT * FROM rca_precision_checklists WHERE rca_id = ?', [id])[0] || null;
        const hra = this.db.query('SELECT * FROM rca_hra_checklists WHERE rca_id = ?', [id])[0] || null;
        const containments = this.db.query('SELECT content FROM rca_containment WHERE rca_id = ?', [id]);
        
        this.enrichRca(rca, fiveWhys, ishikawa, rootCauses, precision, hra, containments);

        // Anexos
        const attRows = this.db.query('SELECT * FROM rcas_attachments WHERE rca_id = ?', [id]);
        rca.attachments = attRows.map(att => this.mapAttachmentRow(att));
        
        return rca;
    }

    public create(rca: Rca): void {
        this.upsert(rca);
    }

    public update(rca: Rca): void {
        this.upsert(rca);
    }

    public delete(id: string): void {
        this.db.transaction(() => {
            this.db.execute('DELETE FROM rca_five_whys WHERE rca_id = ?', [id]);
            this.db.execute('DELETE FROM rca_ishikawa WHERE rca_id = ?', [id]);
            this.db.execute('DELETE FROM rca_root_causes WHERE rca_id = ?', [id]);
            this.db.execute('DELETE FROM rca_precision_checklists WHERE rca_id = ?', [id]);
            this.db.execute('DELETE FROM rca_hra_checklists WHERE rca_id = ?', [id]);
            this.db.execute('DELETE FROM rca_containment WHERE rca_id = ?', [id]);
            this.db.execute('DELETE FROM rcas_attachments WHERE rca_id = ?', [id]);
            this.db.execute('DELETE FROM rcas WHERE id = ?', [id]);
        });
    }

    /**
     * Executa inserções em massa utilizando uma transação para garantir atomicidade e performance.
     */
    public bulkCreate(rcas: Rca[]): void {
        this.db.transaction(() => {
            for (const rca of rcas) {
                this.upsert(rca);
            }
        });
    }

    public bulkDelete(ids: string[]): void {
        this.db.transaction(() => {
            const placeholders = ids.map(() => '?').join(',');
            this.db.execute(`DELETE FROM rca_five_whys WHERE rca_id IN (${placeholders})`, ids);
            this.db.execute(`DELETE FROM rca_ishikawa WHERE rca_id IN (${placeholders})`, ids);
            this.db.execute(`DELETE FROM rca_root_causes WHERE rca_id IN (${placeholders})`, ids);
            this.db.execute(`DELETE FROM rca_precision_checklists WHERE rca_id IN (${placeholders})`, ids);
            this.db.execute(`DELETE FROM rca_hra_checklists WHERE rca_id IN (${placeholders})`, ids);
            this.db.execute(`DELETE FROM rca_containment WHERE rca_id IN (${placeholders})`, ids);
            this.db.execute(`DELETE FROM rcas_attachments WHERE rca_id IN (${placeholders})`, ids);
            
            const stmt = this.db.prepare('DELETE FROM rcas WHERE id = ?');
            for (const id of ids) {
                stmt.run([id]);
            }
            stmt.free();
        });
    }

    public save(rca: Rca): void {
        this.upsert(rca);
    }

    /**
     * Implementa lógica de "Inserir ou Substituir" para garantir integridade em importações.
     * Agora distribuída entre as tabelas rcas, rca_investigations e rcas_attachments.
     */
    private upsert(rca: Rca): void {
        const sql = `
            INSERT OR REPLACE INTO rcas (
                id, version, analysis_date, analysis_duration_minutes, analysis_type, status,
                participants, facilitator, start_date, completion_date, requires_operation_support,
                failure_date, failure_time, downtime_minutes, financial_impact, os_number,
                area_id, equipment_id, subgroup_id, component_type, asset_name_display,
                specialty_id, failure_mode_id, failure_category_id,
                who, what, "when", where_description, problem_description, potential_impacts, quality_impacts,
                general_moc_number, additional_info, file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Mapeamento filtrado para a tabela base (remove campos de investigação e anexos do INSERT/REPLACE)
        const params = [
            this.n(rca.id), this.n(rca.version), this.n(rca.analysis_date), this.n(rca.analysis_duration_minutes) || 0,
            this.n(rca.analysis_type), this.n(rca.status), JSON.stringify(rca.participants || []), this.n(rca.facilitator),
            this.n(rca.start_date), this.n(rca.completion_date), rca.requires_operation_support ? 1 : 0,
            this.n(rca.failure_date), this.n(rca.failure_time), this.n(rca.downtime_minutes) || 0, this.n(rca.financial_impact) || 0,
            this.n(rca.os_number), this.n(rca.area_id), this.n(rca.equipment_id), this.n(rca.subgroup_id), this.n(rca.component_type),
            this.n(rca.asset_name_display), this.n(rca.specialty_id), this.n(rca.failure_mode_id), this.n(rca.failure_category_id),
            this.n(rca.who), this.n(rca.what), this.n(rca.when), this.n(rca.where_description), this.n(rca.problem_description),
            this.n(rca.potential_impacts), this.n(rca.quality_impacts), this.n(rca.general_moc_number),
            JSON.stringify(rca.additional_info || null), this.n(rca.file_path)
        ];

        this.db.transaction(() => {
            this.db.execute(sql, params);
            
            // 1. Análises Relacionais Específicas
            this.db.execute('DELETE FROM rca_five_whys WHERE rca_id = ?', [rca.id]);
            if (rca.five_whys_chains && Array.isArray(rca.five_whys_chains) && rca.five_whys_chains.length > 0) {
                for (const w of rca.five_whys_chains) {
                    this.db.execute(`
                        INSERT OR REPLACE INTO rca_five_whys (id, rca_id, parent_id, question, answer, order_index, chain_id, cause_effect, content)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        w.id || randomUUID(), rca.id, w.parent_id || null, 
                        w.question || '', w.answer || '', w.order_index || 0, 
                        w.chain_id || '', w.cause_effect || '',
                        w.root_node ? JSON.stringify(w.root_node) : null
                    ]);
                }
            } else if (rca.five_whys && Array.isArray(rca.five_whys) && rca.five_whys.length > 0) {
                // Legacy simple five whys
                rca.five_whys.forEach((w: any, idx: number) => {
                    this.db.execute(`
                        INSERT OR REPLACE INTO rca_five_whys (id, rca_id, parent_id, question, answer, order_index, chain_id, cause_effect)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [w.id || randomUUID(), rca.id, null, 'Why?', typeof w === 'object' ? (w.answer || w.why || w.id || '') : w, idx, '', '']);
                });
            }

            this.db.execute('DELETE FROM rca_ishikawa WHERE rca_id = ?', [rca.id]);
            if (rca.ishikawa && typeof rca.ishikawa === 'object') {
                for (const [category, items] of Object.entries(rca.ishikawa)) {
                    if (Array.isArray(items)) {
                        for (const item of items) {
                            const desc = typeof item === 'object' ? (item.text || item.description || '') : String(item || '');
                            const techId = ISHIKAWA_ID_MAP[category] || category;
                            this.db.execute(`
                                INSERT OR REPLACE INTO rca_ishikawa (id, rca_id, category, description)
                                VALUES (?, ?, ?, ?)
                            `, [item.id || randomUUID(), rca.id, techId, desc]);
                        }
                    }
                }
            }

            this.db.execute('DELETE FROM rca_root_causes WHERE rca_id = ?', [rca.id]);
            if (rca.root_causes && Array.isArray(rca.root_causes)) {
                for (const rc of rca.root_causes) {
                    const causeStr = typeof rc === 'object' ? (rc.cause || rc.description || '') : String(rc || '');
                    this.db.execute(`
                        INSERT OR REPLACE INTO rca_root_causes (id, rca_id, root_cause_m_id, cause)
                        VALUES (?, ?, ?, ?)
                    `, [rc.id || randomUUID(), rca.id, rc.root_cause_m_id || '', causeStr]);
                }
            }

            // 2. Checklists Relacionais (Mapeamento Horizontal)
            this.db.execute('DELETE FROM rca_precision_checklists WHERE rca_id = ?', [rca.id]);
            this.db.execute('DELETE FROM rca_hra_checklists WHERE rca_id = ?', [rca.id]);

            if (rca.precision_maintenance && Array.isArray(rca.precision_maintenance)) {
                const p = rca.precision_maintenance;
                const get = (id: string, field: 'status' | 'comment') => p.find(i => i.id === id)?.[field] || '';
                
                this.db.execute(`
                    INSERT OR REPLACE INTO rca_precision_checklists (
                        rca_id,
                        chk_clean_status, chk_clean_comment, chk_tol_status, chk_tol_comment,
                        chk_lube_status, chk_lube_comment, chk_belt_status, chk_belt_comment,
                        chk_load_status, chk_load_comment, chk_align_status, chk_align_comment,
                        chk_bal_status, chk_bal_comment, chk_torque_status, chk_torque_comment,
                        chk_parts_status, chk_parts_comment, chk_func_status, chk_func_comment,
                        chk_doc_status, chk_doc_comment
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    rca.id,
                    get('chk_clean', 'status'), get('chk_clean', 'comment'),
                    get('chk_tol', 'status'), get('chk_tol', 'comment'),
                    get('chk_lube', 'status'), get('chk_lube', 'comment'),
                    get('chk_belt', 'status'), get('chk_belt', 'comment'),
                    get('chk_load', 'status'), get('chk_load', 'comment'),
                    get('chk_align', 'status'), get('chk_align', 'comment'),
                    get('chk_bal', 'status'), get('chk_bal', 'comment'),
                    get('chk_torque', 'status'), get('chk_torque', 'comment'),
                    get('chk_parts', 'status'), get('chk_parts', 'comment'),
                    get('chk_func', 'status'), get('chk_func', 'comment'),
                    get('chk_doc', 'status'), get('chk_doc', 'comment')
                ]);
            }

            if (rca.human_reliability) {
                const hra = rca.human_reliability;
                const getQ = (id: string, field: 'answer' | 'comment') => hra.questions?.find((q: any) => q.id === id)?.[field] || '';
                const getC = (id: string, field: 'selected' | 'description') => {
                    const c = hra.conclusions?.find((c: any) => c.id === id);
                    if (field === 'selected') return c?.selected ? 1 : 0;
                    return c?.description || '';
                };
                
                this.db.execute(`
                    INSERT OR REPLACE INTO rca_hra_checklists (
                        rca_id,
                        q_1_1_answer, q_1_1_comment, q_1_3_answer, q_1_3_comment, q_1_4_answer, q_1_4_comment,
                        q_2_1_answer, q_2_1_comment, q_2_2_answer, q_2_2_comment,
                        q_3_1_answer, q_3_1_comment,
                        q_4_1_answer, q_4_1_comment, q_4_2_answer, q_4_2_comment,
                        q_5_1_answer, q_5_1_comment,
                        q_6_1_answer, q_6_1_comment, q_6_2_answer, q_6_2_comment,
                        c_procedures_selected, c_procedures_description,
                        c_training_selected, c_training_description,
                        c_external_selected, c_external_description,
                        c_routine_selected, c_routine_description,
                        c_organization_selected, c_organization_description,
                        c_measures_selected, c_measures_description,
                        is_validated, validation_comment
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    rca.id,
                    getQ('1.1', 'answer'), getQ('1.1', 'comment'), getQ('1.3', 'answer'), getQ('1.3', 'comment'), getQ('1.4', 'answer'), getQ('1.4', 'comment'),
                    getQ('2.1', 'answer'), getQ('2.1', 'comment'), getQ('2.2', 'answer'), getQ('2.2', 'comment'),
                    getQ('3.1', 'answer'), getQ('3.1', 'comment'),
                    getQ('4.1', 'answer'), getQ('4.1', 'comment'), getQ('4.2', 'answer'), getQ('4.2', 'comment'),
                    getQ('5.1', 'answer'), getQ('5.1', 'comment'),
                    getQ('6.1', 'answer'), getQ('6.1', 'comment'), getQ('6.2', 'answer'), getQ('6.2', 'comment'),
                    getC('procedures', 'selected'), getC('procedures', 'description'),
                    getC('training', 'selected'), getC('training', 'description'),
                    getC('external', 'selected'), getC('external', 'description'),
                    getC('routine', 'selected'), getC('routine', 'description'),
                    getC('organization', 'selected'), getC('organization', 'description'),
                    getC('measures', 'selected'), getC('measures', 'description'),
                    hra.validation?.isValidated || '', hra.validation?.comment || ''
                ]);
            }

            // 3. Contenção e Lições Aprendidas
            this.db.execute('DELETE FROM rca_containment WHERE rca_id = ?', [rca.id]);
            const containmentData: any = {};
            for (const [col, _] of Object.entries(CONTAINMENT_MAP)) {
                const val = (rca as any)[col];
                if (val && Array.isArray(val) && val.length > 0) {
                    containmentData[col] = val;
                }
            }

            if (Object.keys(containmentData).length > 0) {
                this.db.execute(`
                    INSERT OR REPLACE INTO rca_containment (id, rca_id, content)
                    VALUES (?, ?, ?)
                `, [randomUUID(), rca.id, JSON.stringify(containmentData)]);
            }

            // 4. Anexos Normalizados
            this.db.execute('DELETE FROM rcas_attachments WHERE rca_id = ?', [rca.id]);
            if (rca.attachments && Array.isArray(rca.attachments) && rca.attachments.length > 0) {
                for (const att of rca.attachments) {
                    const mappedAtt = this.mapToAttachmentRow(att, rca.id);
                    if (mappedAtt) {
                        this.db.execute(`
                            INSERT INTO rcas_attachments (id, rca_id, filename, storage_path, file_type, size_bytes)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [mappedAtt.id, mappedAtt.rca_id, mappedAtt.filename, mappedAtt.storage_path, mappedAtt.file_type, mappedAtt.size_bytes]);
                    }
                }
            }
        });
    }

    // --- Mapeadores de Dados ---

    private n(val: any): any {
        return val === undefined ? null : val;
    }

    /**
     * Mapeia um objeto de anexo do frontend para o formato do banco de dados.
     */
    private mapToAttachmentRow(att: any, rcaId: string): any {
        if (!att) return null;
        // Suporta ambos os formatos (frontend: url/type, banco: storage_path/file_type)
        return {
            id: att.id || randomUUID(),
            rca_id: rcaId,
            filename: att.filename || (att.url ? att.url.split('/').pop() : 'unknown'),
            storage_path: att.storage_path || att.url || '',
            file_type: att.file_type || att.type || null,
            size_bytes: att.size_bytes || att.size || null
        };
    }

    /**
     * Mapeia uma linha do banco de dados para o objeto de anexo do frontend.
     */
    private mapAttachmentRow(row: any): any {
        return {
            id: row.id,
            filename: row.filename,
            url: row.storage_path,
            type: row.file_type,
            size: row.size_bytes,
            storage_path: row.storage_path, // Mantém compatibilidade interna
            file_type: row.file_type
        };
    }

    /**
     * Desserializa strings JSON do banco para objetos tipados, tratando falhas de parsing de forma resiliente.
     */
    private safeParse(json: string | null, fallback: any): any {
        if (!json) return fallback;
        try {
            return JSON.parse(json);
        } catch (e) {
            logger.warn(`[V2] Falha ao processar JSON: ${json.substring(0, 50)}... Retornando fallback.`);
            return fallback;
        }
    }

    private enrichRca(rca: Rca, fiveWhys: any[], ishikawa: any[], rootCauses: any[], precision: any | null, hra: any | null, containments: any[]): Rca {
        // Five Whys
        if (fiveWhys && fiveWhys.length > 0) {
            const hasChains = fiveWhys.some((w: any) => w.chain_id && w.chain_id.trim() !== '');
            if (hasChains) {
                rca.five_whys_chains = fiveWhys.map(w => ({
                    id: w.id,
                    parent_id: w.parent_id,
                    question: w.question,
                    answer: w.answer,
                    order_index: w.order_index,
                    chain_id: w.chain_id,
                    cause_effect: w.cause_effect,
                    root_node: this.safeParse(w.content, null)
                }));
                rca.five_whys = []; // clear simple array if using chains
            } else {
                rca.five_whys = fiveWhys.map(w => ({ 
                    id: w.id, 
                    why_question: w.question, 
                    answer: w.answer 
                }));
            }
        }

        // Ishikawa
        if (ishikawa && ishikawa.length > 0) {
            rca.ishikawa = { manpower: [], method: [], material: [], machine: [], environment: [], measurement: [] };
            ishikawa.forEach((item: any) => {
                const jsonKey = ISHIKAWA_REV_MAP[item.category] || item.category;
                if (!rca.ishikawa[jsonKey]) rca.ishikawa[jsonKey] = [];
                rca.ishikawa[jsonKey].push({ id: item.id, text: item.description });
            });
        }

        // Root Causes
        if (rootCauses && rootCauses.length > 0) {
            rca.root_causes = rootCauses.map((rc: any) => ({
                id: rc.id,
                root_cause_m_id: rc.root_cause_m_id,
                cause: rc.cause
            }));
        }

        if (precision) {
            const items = ['clean', 'tol', 'lube', 'belt', 'load', 'align', 'bal', 'torque', 'parts', 'func', 'doc'];
            rca.precision_maintenance = items.map(id => ({
                id: `chk_${id}`,
                status: precision[`chk_${id}_status`] || '',
                comment: precision[`chk_${id}_comment`] || ''
            }));
        }

        if (hra) {
            const qIds = ['1.1', '1.3', '1.4', '2.1', '2.2', '3.1', '4.1', '4.2', '5.1', '6.1', '6.2'];
            const cIds = ['procedures', 'training', 'external', 'routine', 'organization', 'measures'];
            
            rca.human_reliability = {
                questions: qIds.map(id => {
                    const colId = id.replace(/\./g, '_');
                    return {
                        id,
                        answer: hra[`q_${colId}_answer`] || '',
                        comment: hra[`q_${colId}_comment`] || ''
                    };
                }),
                conclusions: cIds.map(id => ({
                    id,
                    selected: !!hra[`c_${id}_selected`],
                    description: hra[`c_${id}_description`] || ''
                })),
                validation: {
                    isValidated: hra.is_validated || '',
                    comment: hra.validation_comment || ''
                }
            };
        }

        containments.forEach(inv => {
            const data = this.safeParse(inv.content, {});
            Object.keys(CONTAINMENT_MAP).forEach(colName => {
                if (data[colName]) {
                    (rca as any)[colName] = data[colName];
                }
            });
        });

        return rca;
    }

    private mapRowToRca = (row: any): Rca => {
        return {
            ...row,
            participants: this.safeParse(row.participants, []),
            additional_info: this.safeParse(row.additional_info, null),
            requires_operation_support: !!row.requires_operation_support,
            // Fallback para campos legados se ainda existirem dados nas colunas da tabela rcas
            five_whys: this.safeParse(row.five_whys, []),
            five_whys_chains: this.safeParse(row.five_whys_chains, []),
            ishikawa: this.safeParse(row.ishikawa, {}),
            root_causes: this.safeParse(row.root_causes, []),
            precision_maintenance: this.safeParse(row.precision_maintenance, []),
            human_reliability: this.safeParse(row.human_reliability, null),
            containment_actions: this.safeParse(row.containment_actions, []),
            lessons_learned: this.safeParse(row.lessons_learned, []),
            // Nota: attachments são carregados via tabela dedicada nos métodos find
            attachments: []
        };
    }
}
