/**
 * Proposta: Repositório SQL para gestão da Taxonomia e Configurações Globais.
 * Fluxo: Armazena e recupera o objeto de configuração (JSON) do banco de dados, garantindo que o sistema sempre possua uma estrutura de dados válida através de mesclagem com valores padrão (Fallback).
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { TaxonomyConfig } from '../../domain/types/RcaTypes';
import { logger } from '../logger';

export class SqlTaxonomyRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    /**
     * Recupera a configuração atual da taxonomia montando o objeto a partir das tabelas relacionais.
     */
    public getTaxonomy(): TaxonomyConfig {
        try {
            // Busca dados das tabelas normalizadas
            const specialties = this.db.query('SELECT id, name FROM taxonomy_specialties');
            const failureCategories = this.db.query('SELECT id, name FROM taxonomy_failure_categories');
            const componentTypes = this.db.query('SELECT id, name FROM taxonomy_component_types');
            const rootCauseMs = this.db.query('SELECT id, name FROM taxonomy_root_causes_6m');
            const analysisTypes = this.db.query('SELECT id, name FROM taxonomy_analysis_types');
            const analysisStatuses = this.db.query('SELECT id, name FROM taxonomy_analysis_statuses');
            const triggerStatuses = this.db.query('SELECT id, name FROM taxonomy_trigger_statuses');
            
            // Busca modos de falha e suas relações com especialidades
            const modesRaw = this.db.query('SELECT id, name FROM taxonomy_failure_modes');
            const modeRelations = this.db.query('SELECT failure_mode_id, specialty_id FROM rel_mode_specialty');
            
            // Reconstrói a lista de modos de falha com seus IDs de especialidades
            const failureModes = modesRaw.map(mode => ({
                id: mode.id,
                name: mode.name,
                specialty_ids: modeRelations
                    .filter(rel => rel.failure_mode_id === mode.id)
                    .map(rel => rel.specialty_id)
            }));

            // Se as tabelas estiverem vazias, retorna o fallback padrão
            if (specialties.length === 0 && failureModes.length === 0) {
                return this.getDefaultTaxonomy();
            }

            return {
                analysisTypes,
                analysisStatuses: analysisStatuses.length > 0 ? analysisStatuses : this.getDefaultTaxonomy().analysisStatuses,
                specialties,
                failureModes,
                failureCategories,
                componentTypes,
                rootCauseMs: rootCauseMs.length > 0 ? rootCauseMs : this.getDefaultTaxonomy().rootCauseMs,
                triggerStatuses: triggerStatuses.length > 0 ? triggerStatuses : this.getDefaultTaxonomy().triggerStatuses,
                mandatoryFields: this.getDefaultTaxonomy().mandatoryFields // Mantém fixo por enquanto
            } as TaxonomyConfig;

        } catch (e) {
            logger.error('[V2] Falha ao recuperar taxonomia relacional:', { error: e });
            return this.getDefaultTaxonomy();
        }
    }

    /**
     * Atualiza a configuração da taxonomia sincronizando com as tabelas relacionais.
     */
    public updateTaxonomy(config: Partial<TaxonomyConfig>): void {
        const current = this.getTaxonomy();
        const updated = { ...current, ...config } as TaxonomyConfig;

        // Execução atômica dentro de uma transação
        try {
            this.db.transaction(() => {
                // Limpa tabelas atuais
                this.db.execute('DELETE FROM taxonomy_specialties');
                this.db.execute('DELETE FROM taxonomy_failure_categories');
                this.db.execute('DELETE FROM taxonomy_component_types');
                this.db.execute('DELETE FROM taxonomy_failure_modes');
                this.db.execute('DELETE FROM rel_mode_specialty');
                this.db.execute('DELETE FROM taxonomy_root_causes_6m');
                this.db.execute('DELETE FROM taxonomy_analysis_types');
                this.db.execute('DELETE FROM taxonomy_analysis_statuses');
                this.db.execute('DELETE FROM taxonomy_trigger_statuses');

                // Insere novos dados
                (updated.specialties ?? []).forEach((s: any) => 
                    this.db.execute('INSERT INTO taxonomy_specialties (id, name) VALUES (?, ?)', [s.id, s.name]));
                
                (updated.failureCategories ?? []).forEach((c: any) => 
                    this.db.execute('INSERT INTO taxonomy_failure_categories (id, name) VALUES (?, ?)', [c.id, c.name]));
                
                (updated.componentTypes ?? []).forEach((t: any) => 
                    this.db.execute('INSERT INTO taxonomy_component_types (id, name) VALUES (?, ?)', [t.id, t.name]));
                
                (updated.failureModes ?? []).forEach((m: any) => {
                    this.db.execute('INSERT INTO taxonomy_failure_modes (id, name) VALUES (?, ?)', [m.id, m.name]);
                    m.specialty_ids?.forEach((sid: string) => 
                        this.db.execute('INSERT INTO rel_mode_specialty (failure_mode_id, specialty_id) VALUES (?, ?)', [m.id, sid]));
                });

                (updated.rootCauseMs ?? []).forEach((m: any) => 
                    this.db.execute('INSERT INTO taxonomy_root_causes_6m (id, name) VALUES (?, ?)', [m.id, m.name]));

                (updated.analysisTypes ?? []).forEach((t: any) => 
                    this.db.execute('INSERT INTO taxonomy_analysis_types (id, name) VALUES (?, ?)', [t.id, t.name]));

                (updated.analysisStatuses ?? []).forEach((s: any) => 
                    this.db.execute('INSERT INTO taxonomy_analysis_statuses (id, name) VALUES (?, ?)', [s.id, s.name]));

                (updated.triggerStatuses ?? []).forEach((s: any) => 
                    this.db.execute('INSERT INTO taxonomy_trigger_statuses (id, name) VALUES (?, ?)', [s.id, s.name]));

                // Persiste o JSON na tabela legado 'taxonomy' para compatibilidade
                this.db.execute('DELETE FROM taxonomy');
                this.db.execute('INSERT INTO taxonomy (config) VALUES (?)', [JSON.stringify(updated)]);
            });

            logger.info('[V2] Taxonomia relacional atualizada com sucesso via Transação.');
        } catch (e) {
            logger.error('[V2] Erro crítico na transação da taxonomia relacional:', { error: e });
            throw e;
        }
    }

    /**
     * Define o estado inicial e de segurança (Fallback) da taxonomia.
     * Crucial para evitar quebras na interface caso o banco esteja vazio ou corrompido.
     */
    private getDefaultTaxonomy(): TaxonomyConfig {
        return {
            analysisTypes: [],
            analysisStatuses: [
                { id: 'STATUS-01', name: 'Em Andamento' },
                { id: 'STATUS-02', name: 'Aguardando Verificação' },
                { id: 'STATUS-03', name: 'Concluída' },
                { id: 'STATUS-04', name: 'Cancelada' }
            ],
            specialties: [],
            failureModes: [],
            failureCategories: [],
            componentTypes: [],
            rootCauseMs: [
                { id: 'M1', name: 'Mão de Obra' },
                { id: 'M2', name: 'Método' },
                { id: 'M3', name: 'Material' },
                { id: 'M4', name: 'Máquina' },
                { id: 'M5', name: 'Meio Ambiente' },
                { id: 'M6', name: 'Medida' }
            ],
            triggerStatuses: [
                { id: 'T-STATUS-01', name: 'Novo' },
                { id: 'T-STATUS-02', name: 'Em Análise' },
                { id: 'T-STATUS-03', name: 'Convertido em RCA' },
                { id: 'T-STATUS-04', name: 'Arquivado' }
            ],
            mandatoryFields: {
                trigger: {
                    save: []
                },
                rca: {
                    create: [],
                    conclude: []
                }
            }
        } as TaxonomyConfig;
    }
}