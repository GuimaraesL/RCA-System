/**
 * Proposta: Repositório SQL para gestão da Taxonomia e Configurações Globais.
 * Fluxo: Armazena e recupera o objeto de configuração (JSON) do banco de dados, garantindo que o sistema sempre possua uma estrutura de dados válida através de mesclagem com valores padrão (Fallback).
 */

import { DatabaseConnection } from '../database/DatabaseConnection';
import { TaxonomyConfig } from '../../domain/types/RcaTypes';

export class SqlTaxonomyRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    /**
     * Recupera a configuração atual da taxonomia.
     * Realiza uma mesclagem automática com os valores padrão para garantir que novos campos do sistema estejam presentes mesmo em bases antigas.
     */
    public getTaxonomy(): TaxonomyConfig {
        const rows = this.db.query('SELECT config FROM taxonomy LIMIT 1');

        if (rows.length > 0 && rows[0].config) {
            try {
                const parsed = JSON.parse(rows[0].config);
                const config: TaxonomyConfig = {
                    ...this.getDefaultTaxonomy(),
                    ...parsed
                };
                return config;
            } catch (e) {
                console.error('[V2] Falha ao processar configuração da taxonomia:', e);
            }
        }

        return this.getDefaultTaxonomy();
    }

    /**
     * Atualiza a configuração da taxonomia.
     * Implementa uma estratégia de substituição total da linha única de configuração para simplicidade no SQLite.
     */
    public updateTaxonomy(config: Partial<TaxonomyConfig>): void {
        const current = this.getTaxonomy();
        const updated = { ...current, ...config };

        this.db.execute('DELETE FROM taxonomy');
        this.db.execute('INSERT INTO taxonomy (config) VALUES (?)', [JSON.stringify(updated)]);
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