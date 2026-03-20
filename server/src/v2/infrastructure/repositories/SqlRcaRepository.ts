/**
 * Proposta: Repositório SQL para persistência e consulta de registros de RCA.
 * Fluxo: Gerencia a tradução entre objetos JavaScript complexos (contendo arrays/objetos JSON) e colunas de texto do SQLite,
 *        distribuída entre as tabelas `rcas`, `rca_investigations` e `rcas_attachments`.
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { Rca } from '../../domain/types/RcaTypes';
import { randomUUID } from 'crypto';
import { logger } from '../logger';

const INVESTIGATION_MAP = {
    five_whys: 'FIVE_WHYS',
    ishikawa: 'ISHIKAWA',
    root_causes: 'ROOT_CAUSES',
    precision_maintenance: 'PRECISION_MAINTENANCE',
    human_reliability: 'HUMAN_RELIABILITY',
    containment_actions: 'CONTAINMENT_ACTIONS',
    lessons_learned: 'LESSONS_LEARNED'
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
        
        // Carrega todas as investigações para preenchimento em massa (Otimizado para Exportação)
        const allInv = this.db.query('SELECT rca_id, method_type, content FROM rca_investigations');
        const invByRca = new Map<string, any[]>();
        allInv.forEach(inv => {
            if (!invByRca.has(inv.rca_id)) invByRca.set(inv.rca_id, []);
            invByRca.get(inv.rca_id)?.push(inv);
        });

        // Carrega Anexos em Massa
        const allAtt = this.db.query('SELECT * FROM rcas_attachments');
        const attByRca = new Map<string, any[]>();
        allAtt.forEach(att => {
            if (!attByRca.has(att.rca_id)) attByRca.set(att.rca_id, []);
            attByRca.get(att.rca_id)?.push(this.mapAttachmentRow(att));
        });

        return rcas.map(rca => {
            const enriched = this.enrichRcaWithInvestigations(rca, invByRca.get(rca.id) || []);
            enriched.attachments = attByRca.get(rca.id) || [];
            return enriched;
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
                root_causes, 
                created_at, updated_at
            FROM rcas 
            ORDER BY created_at DESC
        `;
        const rows = this.db.query(sql);
        const rcas = rows.map(this.mapRowToRca);

        const ids = rcas.map(r => r.id);
        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            
            const attRows = this.db.query(`SELECT * FROM rcas_attachments WHERE rca_id IN (${placeholders})`, ids);
            const attByRca = new Map<string, any[]>();
            attRows.forEach(att => {
                if (!attByRca.has(att.rca_id)) attByRca.set(att.rca_id, []);
                attByRca.get(att.rca_id)?.push(this.mapAttachmentRow(att));
            });

            rcas.forEach(rca => {
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
            
            // Investigação
            const invRows = this.db.query(`SELECT rca_id, method_type, content FROM rca_investigations WHERE rca_id IN (${placeholders})`, ids);
            const invByRca = new Map<string, any[]>();
            invRows.forEach(inv => {
                if (!invByRca.has(inv.rca_id)) invByRca.set(inv.rca_id, []);
                invByRca.get(inv.rca_id)?.push(inv);
            });

            // Anexos
            const attRows = this.db.query(`SELECT * FROM rcas_attachments WHERE rca_id IN (${placeholders})`, ids);
            const attByRca = new Map<string, any[]>();
            attRows.forEach(att => {
                if (!attByRca.has(att.rca_id)) attByRca.set(att.rca_id, []);
                attByRca.get(att.rca_id)?.push(this.mapAttachmentRow(att));
            });

            data.forEach(rca => {
                this.enrichRcaWithInvestigations(rca, invByRca.get(rca.id) || []);
                rca.attachments = attByRca.get(rca.id) || [];
            });
        }

        return { data, total };
    }

    public findById(id: string): Rca | null {
        const rows = this.db.query('SELECT * FROM rcas WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        
        const rca = this.mapRowToRca(rows[0]);
        const invRows = this.db.query('SELECT method_type, content FROM rca_investigations WHERE rca_id = ?', [id]);
        this.enrichRcaWithInvestigations(rca, invRows);

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
            this.db.execute('DELETE FROM rca_investigations WHERE rca_id = ?', [id]);
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
            this.db.execute(`DELETE FROM rca_investigations WHERE rca_id IN (${placeholders})`, ids);
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
                general_moc_number, additional_info, file_path, five_whys_chains
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            JSON.stringify(rca.additional_info || null), this.n(rca.file_path), JSON.stringify(rca.five_whys_chains || [])
        ];

        this.db.transaction(() => {
            this.db.execute(sql, params);
            
            // 1. Investigações JSON (Ishikawa, Precision Maintenance, etc.)
            this.db.execute('DELETE FROM rca_investigations WHERE rca_id = ?', [rca.id]);
            for (const [col, method] of Object.entries(INVESTIGATION_MAP)) {
                const content = (rca as any)[col];
                if (content && (Array.isArray(content) ? content.length > 0 : Object.keys(content).length > 0)) {
                    this.db.execute(`
                        INSERT INTO rca_investigations (id, rca_id, method_type, content)
                        VALUES (?, ?, ?, ?)
                    `, [randomUUID(), rca.id, method, JSON.stringify(content)]);
                }
            }

            // 2. Anexos Normalizados
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

    private enrichRcaWithInvestigations(rca: Rca, invRows: any[]): Rca {
        invRows.forEach(inv => {
            const colEntry = Object.entries(INVESTIGATION_MAP).find(([_, method]) => method === inv.method_type);
            if (colEntry) {
                const colName = colEntry[0];
                (rca as any)[colName] = this.safeParse(inv.content, (rca as any)[colName]);
            }
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
