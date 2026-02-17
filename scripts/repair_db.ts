/**
 * Proposta: Reparar o banco de dados SQL através do reprocessamento do arquivo JSON consolidado da V17.
 * Fluxo: Limpa tabelas existentes -> Carrega JSON de migração -> Insere RCAs preservando UUIDs -> Insere Ações vinculadas -> Commit da transação.
 */

import fs from 'fs';
import path from 'path';
import { DatabaseConnection } from '../server/src/v2/infrastructure/database/DatabaseConnection';
import { SqlRcaRepository } from '../server/src/v2/infrastructure/repositories/SqlRcaRepository';
import { SqlActionRepository } from '../server/src/v2/infrastructure/repositories/SqlActionRepository';

async function repair() {
    console.log('Iniciando Processo de Reparo...');
    const db = DatabaseConnection.getInstance();
    await db.initialize();

    // 1. Limpa o banco
    console.log('🧹 Limpando Banco de Dados...');
    db.execute('DELETE FROM actions');
    db.execute('DELETE FROM triggers');
    db.execute('DELETE FROM rcas'); // A ordem importa para integridade referencial

    // 2. Carrega JSON
    const jsonPath = path.resolve(__dirname, '../tests/data/rca_migration_v17_consolidated.json');
    console.log(`📂 Carregando JSON de ${jsonPath}`);
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    const records = data.records || [];
    const actions = data.actions || [];

    console.log(`📊 Encontrados ${records.length} registros e ${actions.length} ações.`);

    const rcaRepo = new SqlRcaRepository();

    // 3. Insere Registros (UUIDs preservados do JSON)
    console.log('🔄 Inserindo RCAs...');
    let rcaCount = 0;

    // Inicia transação
    db.execute('BEGIN TRANSACTION');

    try {
        for (const r of records) {
            // O repositório lida com o mapeamento e salvamento
            await rcaRepo.save(r);
            rcaCount++;
        }
        console.log(`✅ RCAs Inseridas: ${rcaCount}`);

        // 4. Insere Ações
        console.log('🔄 Inserindo Ações...');
        let actionCount = 0;
        for (const a of actions) {
            // Como as RCAs foram inseridas com UUIDs, as ações vinculadas manterão a integridade
            const stmt = db.prepare(`
                INSERT INTO actions (id, rca_id, action, responsible, date, status, moc_number)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run([
                a.id,
                a.rca_id,
                a.action,
                a.responsible || 'Desconhecido',
                a.date,
                a.status,
                a.moc_number
            ]);
            actionCount++;
        }
        console.log(`✅ Ações Inseridas: ${actionCount}`);

        db.execute('COMMIT');
        console.log('✅ COMMIT realizado com sucesso.');

    } catch (e) {
        console.error('❌ Erro durante a importação:', e);
        db.execute('ROLLBACK');
    }
}

repair();
