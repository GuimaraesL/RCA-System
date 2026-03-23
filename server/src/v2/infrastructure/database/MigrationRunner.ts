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
            },
            {
                name: 'v4.0: Criar tabelas relacionais de taxonomia',
                up: `
                    CREATE TABLE IF NOT EXISTS taxonomy_specialties (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS taxonomy_failure_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS taxonomy_component_types (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS taxonomy_root_causes_6m (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS taxonomy_failure_modes (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS taxonomy_analysis_types (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS taxonomy_analysis_statuses (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS taxonomy_trigger_statuses (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                `
            },
            {
                name: 'v5.0: Otimização de performance em ativos',
                up: "CREATE INDEX IF NOT EXISTS idx_assets_parent_id ON assets(parent_id)"
            },
            {
                name: 'v6.1: Garantir colunas acidentalmente omitidas na tabela rcas',
                up: `
                    ALTER TABLE rcas ADD COLUMN additional_info TEXT;
                    ALTER TABLE rcas ADD COLUMN problem_description TEXT;
                `
            },
            {
                name: 'v6.2: Adicionar coluna content na tabela rca_five_whys para suporte a Hierarquia',
                up: "ALTER TABLE rca_five_whys ADD COLUMN content TEXT;"
            },
            {
                name: 'v7.0: Limpeza de schema legado',
                up: `
                    DROP TABLE IF EXISTS rel_mode_specialty;
                    DROP TABLE IF EXISTS rel_mode_speciality;
                    ALTER TABLE rcas DROP COLUMN five_whys;
                    ALTER TABLE rcas DROP COLUMN five_whys_chains;
                    ALTER TABLE rcas DROP COLUMN attachments;
                `
            },
            {
                name: 'v8.0: Normalizar categorias de Ishikawa para IDs M1-M6',
                up: `
                    UPDATE rca_ishikawa SET category = 'M1' WHERE category = 'manpower';
                    UPDATE rca_ishikawa SET category = 'M2' WHERE category = 'method';
                    UPDATE rca_ishikawa SET category = 'M3' WHERE category = 'material';
                    UPDATE rca_ishikawa SET category = 'M4' WHERE category = 'machine';
                    UPDATE rca_ishikawa SET category = 'M5' WHERE category = 'environment';
                    UPDATE rca_ishikawa SET category = 'M6' WHERE category = 'measurement';
                `
            }
        ];

        for (const migration of migrations) {
            try {
                if (migration.up.includes(';')) {
                    const stmts = migration.up.split(';').filter(s => s.trim().length > 0);
                    for (const stmt of stmts) {
                        try {
                            this.db.execute(stmt);
                        } catch (innerE: any) {
                            if (!innerE.message.includes("duplicate column name")) {
                                throw innerE; // Rethrow se não for um duplicate column esperado
                            }
                        }
                    }
                } else {
                    this.db.execute(migration.up);
                }
            } catch (e: any) {
                if (!e.message.includes("duplicate column name")) {
                    // logger.warn(`[V2] Falha não crítica na migração ${migration.name}:`, e.message);
                }
            }
        }

        // Migração especial v6.0: Reparo de encoding UTF-8
        this.repairTaxonomyEncoding();
    }

    /**
     * Repara strings com encoding UTF-8 corrompido (mojibake) nas tabelas de taxonomia.
     * Causa raiz: bytes UTF-8 interpretados como CP850 e re-codificados como UTF-8.
     */
    private repairTaxonomyEncoding(): void {
        const cp850Unicode: number[] = [
            0x00C7, 0x00FC, 0x00E9, 0x00E2, 0x00E4, 0x00E0, 0x00E5, 0x00E7,
            0x00EA, 0x00EB, 0x00E8, 0x00EF, 0x00EE, 0x00EC, 0x00C4, 0x00C5,
            0x00C9, 0x00E6, 0x00C6, 0x00F4, 0x00F6, 0x00F2, 0x00FB, 0x00F9,
            0x00FF, 0x00D6, 0x00DC, 0x00F8, 0x00A3, 0x00D8, 0x00D7, 0x0192,
            0x00E1, 0x00ED, 0x00F3, 0x00FA, 0x00F1, 0x00D1, 0x00AA, 0x00BA,
            0x00BF, 0x00AE, 0x00AC, 0x00BD, 0x00BC, 0x00A1, 0x00AB, 0x00BB,
            0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x00C1, 0x00C2, 0x00C0,
            0x00A9, 0x2563, 0x2551, 0x2557, 0x255D, 0x00A2, 0x00A5, 0x2510,
            0x2514, 0x2534, 0x252C, 0x251C, 0x2500, 0x253C, 0x00E3, 0x00C3,
            0x255A, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256C, 0x00A4,
            0x00F0, 0x00D0, 0x00CA, 0x00CB, 0x00C8, 0x0131, 0x00CD, 0x00CE,
            0x00CF, 0x2518, 0x250C, 0x2588, 0x2584, 0x00A6, 0x00CC, 0x2580,
            0x00D3, 0x00DF, 0x00D4, 0x00D2, 0x00F5, 0x00D5, 0x00B5, 0x00FE,
            0x00DE, 0x00DA, 0x00DB, 0x00D9, 0x00FD, 0x00DD, 0x00AF, 0x00B4,
            0x00AD, 0x00B1, 0x2017, 0x00BE, 0x00B6, 0x00A7, 0x00F7, 0x00B8,
            0x00B0, 0x00A8, 0x00B7, 0x00B9, 0x00B3, 0x00B2, 0x25A0, 0x00A0,
        ];

        const unicodeToCp850 = new Map<number, number>();
        for (let i = 0; i < 128; i++) unicodeToCp850.set(i, i);
        for (let i = 0; i < cp850Unicode.length; i++) {
            unicodeToCp850.set(cp850Unicode[i], i + 0x80);
        }

        const fixMojibake = (str: string): string => {
            const codepoints = [...str].map(c => c.codePointAt(0)!);
            const bytes: number[] = [];
            for (const cp of codepoints) {
                const byte = unicodeToCp850.get(cp);
                if (byte !== undefined) {
                    bytes.push(byte);
                } else {
                    const charBuf = Buffer.from(String.fromCodePoint(cp), 'utf-8');
                    for (const b of charBuf) bytes.push(b);
                }
            }
            return Buffer.from(bytes).toString('utf-8');
        };

        /** 
         * Detecta apenas mojibake real (├) ou caracteres de erro ().
         * Removido o regex [\u0080-\u00FF] que causava a corrupção de caracteres já corretos.
         */
        const hasMojibake = (str: string): boolean => 
            !!str && (str.includes('\u251C') || str.includes('\uFFFD'));

        /** 
         * Lógica de recuperação segura:
         * 1. Se tem ├, é mojibake CP850 e pode ser revertido matematicamente.
         * 2. Se tem  ou padrões conhecidos quebrados, aplica o dicionário de emergência.
         */
        const smartFix = (str: string): string => {
            if (!str) return str;
            
            // 1. Reversão matemática de Mojibake CP850 (ex: ├º -> ç)
            let fixed = str.includes('\u251C') ? fixMojibake(str) : str;
            
            // 2. Recuperação de strings com perda de dados ()
            if (fixed.includes('\uFFFD') || /Instala|Automa|Mec.nica|El.trica|Mudana/i.test(fixed)) {
                const emergencyMap: Record<string, string> = {
                    'Instala\uFFFD\uFFFDo': 'Instalação',
                    'Instalao': 'Instalação',
                    'Automa\uFFFD\uFFFDo': 'Automação',
                    'Automao': 'Automação',
                    'Mec\uFFFDanicas': 'Mecânicas',
                    'El\uFFFDtrica': 'Elétrica',
                    'Mudana': 'Mudança',
                    'Gest\uFFFDo': 'Gestão',
                    'Gesto': 'Gestão',
                    'Manuteno': 'Manutenção',
                    'Pea': 'Peça',
                    'Modificao': 'Modificação',
                    'anlise': 'análise'
                };
                
                for (const [key, val] of Object.entries(emergencyMap)) {
                    if (fixed.includes(key)) fixed = fixed.replace(key, val);
                }
                
                // Limpeza agressiva para IDs que ficaram com 
                if (fixed.includes('\uFFFD')) {
                    fixed = fixed.replace(/\uFFFD/g, ''); 
                }
            }

            return fixed;
        };

        const tables = [
            'taxonomy_specialties', 'taxonomy_failure_categories',
            'taxonomy_component_types', 'taxonomy_root_causes_6m',
            'taxonomy_failure_modes', 'taxonomy_analysis_types',
            'taxonomy_analysis_statuses', 'taxonomy_trigger_statuses'
        ];

        try {
            let totalFixed = 0;
            this.db.transaction(() => {
                for (const table of tables) {
                    try {
                        const rows = this.db.query(`SELECT id, name FROM ${table}`);
                        for (const row of rows) {
                            const name = row.name as string;
                            const id = row.id as string;
                            const nameCorrupted = hasMojibake(name);
                            const idCorrupted = hasMojibake(id);

                            if (!nameCorrupted && !idCorrupted) continue;

                            const fixedName = nameCorrupted ? smartFix(name) : name;
                            const fixedId = idCorrupted ? smartFix(id) : id;

                            if (idCorrupted) {
                                if (table === 'taxonomy_specialties') {
                                    try { this.db.execute('UPDATE rel_mode_specialty SET specialty_id = ? WHERE specialty_id = ?', [fixedId, id]); } catch (e) {}
                                }
                                if (table === 'taxonomy_failure_modes') {
                                    try { this.db.execute('UPDATE rel_mode_specialty SET failure_mode_id = ? WHERE failure_mode_id = ?', [fixedId, id]); } catch (e) {}
                                }
                                this.db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
                                this.db.execute(`INSERT INTO ${table} (id, name) VALUES (?, ?)`, [fixedId, fixedName]);
                            } else if (nameCorrupted) {
                                this.db.execute(`UPDATE ${table} SET name = ? WHERE id = ?`, [fixedName, id]);
                            }
                            totalFixed++;
                        }
                    } catch (e) {
                        // Tabela pode não existir
                    }
                }

                // Repara tabela legado
                try {
                    const legacyRows = this.db.query("SELECT rowid, config FROM taxonomy LIMIT 1");
                    if (legacyRows.length > 0) {
                        const configStr = legacyRows[0].config as string;
                        if (hasMojibake(configStr)) {
                            this.db.execute('UPDATE taxonomy SET config = ? WHERE rowid = ?', [smartFix(configStr), legacyRows[0].rowid]);
                            totalFixed++;
                        }
                    }
                } catch (e) {}
            });

            if (totalFixed > 0) {
                (this.db as any).flush();
                logger.info(`[V2] 🔧 Migração v6.0: ${totalFixed} registros de taxonomia reparados (CP850-UTF8)`);
            }
        } catch (e) {
            logger.error('[V2] ⚠️ Erro ao reparar encoding da taxonomia:', { error: e });
        }
    }
}