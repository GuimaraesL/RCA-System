import { DatabaseConnection } from '../database/DatabaseConnection';
import { TaxonomyConfig } from '../../domain/types/RcaTypes';

export class SqlTaxonomyRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public getTaxonomy(): TaxonomyConfig {
        const rows = this.db.query('SELECT config FROM taxonomy LIMIT 1');
        // console.log(`[V2] SqlTaxonomyRepository.getTaxonomy: Found ${rows.length} rows`);

        if (rows.length > 0 && rows[0].config) {
            try {
                const parsed = JSON.parse(rows[0].config);
                // Merge with default to guarantee structure
                const config: TaxonomyConfig = {
                    ...this.getDefaultTaxonomy(),
                    ...parsed
                };
                // console.log(`[V2] Taxonomy parsed successfully. Analysis Statuses: ${config.analysisStatuses?.length}`);
                return config;
            } catch (e) {
                console.error('[V2] Failed to parse taxonomy config', e);
            }
        }

        // Fallback default (Comprehensive to prevent Frontend crash)
        return this.getDefaultTaxonomy();
    }

    public updateTaxonomy(config: Partial<TaxonomyConfig>): void {
        const current = this.getTaxonomy();
        const updated = { ...current, ...config };

        // In sql.js/sqlite, simpler to replace the single row
        this.db.execute('DELETE FROM taxonomy');
        this.db.execute('INSERT INTO taxonomy (config) VALUES (?)', [JSON.stringify(updated)]);
    }

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
