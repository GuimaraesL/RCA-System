/**
 * Proposta: Validar a consistência de dados entre a ponte V1 e V2 do banco de dados.
 * Fluxo: Inicializa banco V1 -> Obtém instância V2 -> Realiza o bridging -> Compara contagem de registros entre as duas versões.
 */

const { initDatabase, getDatabase } = require('./server/dist/db/database');
const { DatabaseConnection } = require('./server/dist/v2/infrastructure/database/DatabaseConnection');

async function check() {
    try {
        console.log('--- VERIFICAÇÃO DE CONSISTÊNCIA ---');

        // 1. Inicializa V1
        const v1Db = await initDatabase();
        const v1Count = v1Db.exec('SELECT COUNT(*) FROM rcas')[0].values[0][0];
        console.log('Contagem RCA V1:', v1Count);

        // 2. Inicializa singleton V2
        const v2 = DatabaseConnection.getInstance();

        // Verifica se V2 já possui banco
        console.log('V2 possui DB antes da ponte:', !!v2.db);

        // 3. Ponte V1 -> V2
        v2.setRawDatabase(v1Db);
        console.log('V2 possui DB após a ponte:', !!v2.db);

        // 4. Verifica contagem V2
        const v2Count = v2.query('SELECT COUNT(*) FROM rcas')[0]['COUNT(*)'];
        console.log('Contagem RCA V2:', v2Count);

        if (v1Count === v2Count) {
            console.log('✅ Contagens coincidem!');
        } else {
            console.log('❌ DIVERGÊNCIA nas contagens!');
        }

    } catch (e) {
        console.error('Falha na verificação:', e);
    }
}

check();
