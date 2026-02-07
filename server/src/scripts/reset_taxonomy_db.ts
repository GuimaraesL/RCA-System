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
        analysisTypes: [
            { id: 'TYPE-01', name: 'Falha de Equipamento' },
            { id: 'TYPE-02', name: 'Falha de Processo' },
            { id: 'TYPE-03', name: 'Segurança' },
            { id: 'TYPE-04', name: 'Meio Ambiente' }
        ],
        analysisStatuses: [
            { id: 'STATUS-01', name: 'Em Andamento' },
            { id: 'STATUS-WAITING', name: 'Aguardando Verificação' },
            { id: 'STATUS-03', name: 'Concluída' },
            { id: 'STATUS-04', name: 'Cancelada' }
        ],
        specialties: [
            { id: 'SPEC-01', name: 'Mecânica' },
            { id: 'SPEC-02', name: 'Elétrica' },
            { id: 'SPEC-03', name: 'Operação' },
            { id: 'SPEC-04', name: 'Automação' }
        ],
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
                save: ['start_date', 'stop_reason']
            },
            rca: {
                create: ['subgroup_id', 'failure_date', 'analysis_type', 'what'],
                conclude: ['root_causes', 'five_whys', 'ishikawa']
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
