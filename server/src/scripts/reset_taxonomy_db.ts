import { SqlTaxonomyRepository } from '../v2/infrastructure/repositories/SqlTaxonomyRepository'
import { DatabaseConnection } from '../v2/infrastructure/database/DatabaseConnection'

async function run() {
    console.log('Initializing DB...');
    const db = DatabaseConnection.getInstance();
    await db.initialize();

    console.log('Resetting Taxonomy to Defaults...');
    const repo = new SqlTaxonomyRepository();

    // Instead of getting current, we want to FORCE default.
    // But repo.getTaxonomy() returns from DB if exists.
    // We can manually construct the default state or trust repo.getDefaultTaxonomy() if we could access it.
    // Since getDefaultTaxonomy is private, we will hardcode the known good state here, 
    // effectively mimicking a "Factory Reset".

    const defaultTaxonomy = {
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
    };

    repo.updateTaxonomy(defaultTaxonomy);
    console.log('✅ Taxonomy reset to CLEAN defaults.');

    // manual flush
    db.flush();
}

run().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
