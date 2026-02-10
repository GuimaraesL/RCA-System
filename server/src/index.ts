/**
 * Proposta: Ponto de entrada principal do Servidor Express para o RCA System API.
 * Fluxo: Inicializa middlewares, monta as rotas da arquitetura V2 e orquestra a conexão assíncrona com o banco de dados (sql.js).
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Montagem das Rotas da API
import v2Router from './v2/routes';
app.use('/api', v2Router); // Centraliza todos os endpoints (RCAs, Gatilhos, Ações, etc.) na arquitetura V2

// Endpoint de verificação de saúde do sistema
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Inicialização orquestrada do banco de dados e do servidor HTTP.
 * Necessário ser assíncrono para aguardar a carga do WebAssembly do sql.js.
 */
const startServer = async () => {
    try {
        // Inicialização da Conexão com o Banco de Dados
        const { DatabaseConnection } = await import('./v2/infrastructure/database/DatabaseConnection');
        await DatabaseConnection.getInstance().initialize();
        console.log('✅ Conexão com o banco de dados inicializada');

        // Execução de Migrações (Criação de tabelas e atualizações de schema)
        const { MigrationRunner } = await import('./v2/infrastructure/database/MigrationRunner');
        await new MigrationRunner().run();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
            console.log(`📡 Endpoints disponíveis:`);
            console.log(`   GET  /api/health`);
            console.log(`   CRUD /api/rcas`);
            console.log(`   CRUD /api/triggers`);
            console.log(`   CRUD /api/actions`);
            console.log(`   GET/PUT /api/taxonomy`);
            console.log(`   CRUD /api/assets`);
        });
    } catch (error) {
        console.error('❌ Erro crítico ao iniciar servidor:', error);
        process.exit(1);
    }
};

/**
 * Hook de desligamento suave (Graceful Shutdown).
 * Garante que dados em memória (debounce de escrita) sejam persistidos no disco antes de encerrar o processo.
 */
const handleShutdown = () => {
    console.log('\n[Servidor] 🛑 Encerrando processo...');
    try {
        const { DatabaseConnection } = require('./v2/infrastructure/database/DatabaseConnection');
        DatabaseConnection.getInstance().flush();
        console.log('[Servidor] ✅ Base de dados persistida com sucesso.');
        process.exit(0);
    } catch (err) {
        console.error('[Servidor] ❌ Erro ao persistir base de dados no encerramento:', err);
        process.exit(1);
    }
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

startServer();