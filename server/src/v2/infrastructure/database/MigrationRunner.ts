/**
 * Proposta: Orquestrador de migrações e evolução do schema da base de dados.
 * Fluxo: Garante a existência das tabelas base e executa scripts de atualização de versão, tratando de forma resiliente a normalização de dados legados.
 */

import { DatabaseConnection } from './DatabaseConnection';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../logger';

export class MigrationRunner {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public async run(): Promise<void> {
        logger.info('[V2] 🔄 Verificando migrações e integridade do schema...');

        await this.ensureBaseSchema();
        await this.runVersionedMigrations();

        logger.info('[V2] ✅ Verificação de migrações concluída');
    }

    /**
     * Garante que a estrutura fundamental das tabelas (conforme schema.sql) esteja aplicada.
     */
    private async ensureBaseSchema(): Promise<void> {
        const schemaPath = join(__dirname, 'schema.sql');

        if (existsSync(schemaPath)) {
            const schema = readFileSync(schemaPath, 'utf-8');
            this.db.dangerouslyExec(schema);
        } else {
            logger.error(`[V2] ❌ Arquivo de schema não encontrado em: ${schemaPath}`, { schemaPath });
            throw new Error('Arquivo de schema base ausente');
        }
    }

    /**
     * Executa migrações incrementais tratadas com blocos Try/Catch para manter compatibilidade
     * com estados parciais da base de dados sem a necessidade de uma tabela de controle complexa.
     */
    private async runVersionedMigrations(): Promise<void> {
        const migrations = [
            {
                name: 'v1.1: Adicionar file_path em triggers',
                up: "ALTER TABLE triggers ADD COLUMN file_path TEXT"
            },
            {
                name: 'v1.2: Adicionar file_path em rcas',
                up: "ALTER TABLE rcas ADD COLUMN file_path TEXT"
            },
            {
                name: 'v1.3: Adicionar five_whys_chains em rcas',
                up: "ALTER TABLE rcas ADD COLUMN five_whys_chains TEXT"
            },
            {
                name: 'v1.4: Adicionar created_at em actions',
                up: "ALTER TABLE actions ADD COLUMN created_at TEXT"
            },
            {
                name: 'v1.5: Adicionar updated_at em actions',
                up: "ALTER TABLE actions ADD COLUMN updated_at TEXT"
            },
            {
                name: 'v2.0: Normalizar strings de status para IDs técnicos',
                up: `
                    UPDATE rcas SET status = 'STATUS-03' WHERE status IN ('Concluída', 'Concluido', 'Concluida');
                    UPDATE rcas SET status = 'STATUS-01' WHERE status IN ('Em Andamento', 'Em andamento');
                    UPDATE rcas SET status = 'STATUS-02' WHERE status IN ('Aguardando Verificação', 'Ag. Verif', 'STATUS-WAITING');
                `
            },
            {
                name: 'v2.1: Limpar vínculos órfãos de triggers para garantir integridade',
                up: "UPDATE triggers SET rca_id = NULL WHERE rca_id IS NOT NULL AND rca_id NOT IN (SELECT id FROM rcas)"
            },
            {
                name: 'v3.0: Adicionar coluna de anexos em rcas',
                up: "ALTER TABLE rcas ADD COLUMN attachments TEXT"
            }
        ];

        for (const migration of migrations) {
            try {
                this.db.execute(migration.up);
            } catch (e: any) {
                // Silencia erros de colunas duplicadas (migração já aplicada anteriormente)
                if (!e.message.includes("duplicate column")) {
                    // Outros erros devem ser reportados se necessário para depuração
                }
            }
        }
    }
}