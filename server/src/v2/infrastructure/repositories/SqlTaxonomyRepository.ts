import { DatabaseConnection } from '../database/DatabaseConnection';
import { TaxonomyConfig } from '../../domain/types/RcaTypes';

export class SqlTaxonomyRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public getTaxonomy(): TaxonomyConfig {
        const rows = this.db.query('SELECT config FROM taxonomy LIMIT 1');
        if (rows.length > 0 && rows[0].config) {
            try {
                return JSON.parse(rows[0].config) as TaxonomyConfig;
            } catch (e) {
                console.error('[V2] Failed to parse taxonomy config', e);
            }
        }

        // Fallback default (copiado do código legado para garantir funcionamento)
        return {
            analysisStatuses: [
                { id: 'STATUS-01', name: 'Em Andamento' },
                { id: 'STATUS-WAITING', name: 'Aguardando Verificação' },
                { id: 'STATUS-03', name: 'Concluída' }
            ],
            mandatoryFields: {
                rca: {
                    create: ['subgroup_id', 'failure_date', 'analysis_type', 'what'],
                    conclude: ['root_causes', 'five_whys', 'ishikawa']
                }
            }
        } as TaxonomyConfig;
    }
}
