/**
 * Proposta: Repositório SQL para persistência e consulta de registros de RCA.
 * Fluxo: Gerencia a tradução entre objetos JavaScript complexos (contendo arrays/objetos JSON) e colunas de texto do SQLite, além de prover visões otimizadas para performance.
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { Rca } from '../../domain/types/RcaTypes';

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
        return rows.map(this.mapRowToRca);
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
        return rows.map(this.mapRowToRca);
    }

    public findAllPaginated(page: number, limit: number): { data: Rca[], total: number } {
        const offset = (page - 1) * limit;

        // 1. Recupera contagem total para orquestração da paginação
        const countResult = this.db.query('SELECT COUNT(*) as total FROM rcas');
        const total = countResult[0]?.total || 0;

        // 2. Recupera fatia de dados (Lazy Load)
        const rows = this.db.query('SELECT * FROM rcas ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);

        return {
            data: rows.map(this.mapRowToRca),
            total
        };
    }

    public findById(id: string): Rca | null {
        const rows = this.db.query('SELECT * FROM rcas WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return this.mapRowToRca(rows[0]);
    }

    public create(rca: Rca): void {
        const sql = `
            INSERT INTO rcas (
                id, version, analysis_date, analysis_duration_minutes, analysis_type, status,
                participants, facilitator, start_date, completion_date, requires_operation_support,
                failure_date, failure_time, downtime_minutes, financial_impact, os_number,
                area_id, equipment_id, subgroup_id, component_type, asset_name_display,
                specialty_id, failure_mode_id, failure_category_id,
                who, what, "when", where_description, problem_description, potential_impacts, quality_impacts,
                five_whys, five_whys_chains, ishikawa, root_causes,
                precision_maintenance, human_reliability,
                containment_actions, lessons_learned, general_moc_number, additional_info, file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = this.mapRcaToParams(rca);
        this.db.execute(sql, params);
    }

    public update(rca: Rca): void {
        const sql = `
            UPDATE rcas SET
                version = ?, analysis_date = ?, analysis_duration_minutes = ?, analysis_type = ?, status = ?,
                participants = ?, facilitator = ?, start_date = ?, completion_date = ?, requires_operation_support = ?,
                failure_date = ?, failure_time = ?, downtime_minutes = ?, financial_impact = ?, os_number = ?,
                area_id = ?, equipment_id = ?, subgroup_id = ?, component_type = ?, asset_name_display = ?,
                specialty_id = ?, failure_mode_id = ?, failure_category_id = ?,
                who = ?, what = ?, "when" = ?, where_description = ?, problem_description = ?, potential_impacts = ?, quality_impacts = ?,
                five_whys = ?, five_whys_chains = ?, ishikawa = ?, root_causes = ?,
                precision_maintenance = ?, human_reliability = ?,
                containment_actions = ?, lessons_learned = ?, general_moc_number = ?, additional_info = ?, file_path = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `;
        const allParams = this.mapRcaToParams(rca);
        const updateParams = allParams.slice(1); // Remove o ID da primeira posição (esperado pelo INSERT)
        updateParams.push(rca.id); // Adiciona o ID no final para a cláusula WHERE do UPDATE
        this.db.execute(sql, updateParams);
    }

    public delete(id: string): void {
        this.db.execute('DELETE FROM rcas WHERE id = ?', [id]);
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
                five_whys, five_whys_chains, ishikawa, root_causes,
                precision_maintenance, human_reliability,
                containment_actions, lessons_learned, general_moc_number, additional_info, file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = this.mapRcaToParams(rca);
        this.db.execute(sql, params);
    }

    // --- Mapeadores de Dados ---

    private n(val: any): any {
        return val === undefined ? null : val;
    }

    /**
     * Desserializa strings JSON do banco para objetos tipados, tratando falhas de parsing de forma resiliente.
     */
    private safeParse(json: string | null, fallback: any): any {
        if (!json) return fallback;
        try {
            return JSON.parse(json);
        } catch (e) {
            console.warn(`[V2] Falha ao processar JSON: ${json.substring(0, 50)}... Retornando fallback.`);
            return fallback;
        }
    }

    private mapRowToRca = (row: any): Rca => {
        return {
            ...row,
            participants: this.safeParse(row.participants, []),
            five_whys: this.safeParse(row.five_whys, []),
            five_whys_chains: this.safeParse(row.five_whys_chains, []),
            ishikawa: this.safeParse(row.ishikawa, {}),
            root_causes: this.safeParse(row.root_causes, []),
            precision_maintenance: this.safeParse(row.precision_maintenance, []),
            human_reliability: this.safeParse(row.human_reliability, null),
            containment_actions: this.safeParse(row.containment_actions, []),
            lessons_learned: this.safeParse(row.lessons_learned, []),
            additional_info: this.safeParse(row.additional_info, null),
            requires_operation_support: !!row.requires_operation_support
        };
    }

    /**
     * Serializa o objeto RCA para o formato de parâmetros esperado pelo motor SQL.
     */
    private mapRcaToParams(rca: Rca): any[] {
        return [
            this.n(rca.id),
            this.n(rca.version),
            this.n(rca.analysis_date),
            this.n(rca.analysis_duration_minutes) || 0,
            this.n(rca.analysis_type),
            this.n(rca.status),
            JSON.stringify(rca.participants || []),
            this.n(rca.facilitator),
            this.n(rca.start_date),
            this.n(rca.completion_date),
            rca.requires_operation_support ? 1 : 0,
            this.n(rca.failure_date),
            this.n(rca.failure_time),
            this.n(rca.downtime_minutes) || 0,
            this.n(rca.financial_impact) || 0,
            this.n(rca.os_number),
            this.n(rca.area_id),
            this.n(rca.equipment_id),
            this.n(rca.subgroup_id),
            this.n(rca.component_type),
            this.n(rca.asset_name_display),
            this.n(rca.specialty_id),
            this.n(rca.failure_mode_id),
            this.n(rca.failure_category_id),
            this.n(rca.who),
            this.n(rca.what),
            this.n(rca.when),
            this.n(rca.where_description),
            this.n(rca.problem_description),
            this.n(rca.potential_impacts),
            this.n(rca.quality_impacts),
            JSON.stringify(rca.five_whys || []),
            JSON.stringify(rca.five_whys_chains || []),
            JSON.stringify(rca.ishikawa || {}),
            JSON.stringify(rca.root_causes || []),
            JSON.stringify(rca.precision_maintenance || []),
            JSON.stringify(rca.human_reliability || null),
            JSON.stringify(rca.containment_actions || []),
            JSON.stringify(rca.lessons_learned || []),
            this.n(rca.general_moc_number),
            JSON.stringify(rca.additional_info || null),
            this.n(rca.file_path)
        ];
    }
}