/**
 * Proposta: Ponto de entrada principal do Servidor Express para o RCA System API.
 * Fluxo: Inicializa middlewares, monta as rotas da arquitetura V2 e orquestra a conexão assíncrona com o banco de dados (sql.js).
 */

import 'dotenv/config';
import express from 'express';

import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de Middlewares de Segurança
app.use(helmet()); // Proteção contra vulnerabilidades web comuns (Issue #50)
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Montagem das Rotas da API
import v2Router from './v2/routes';
import { logger } from './v2/infrastructure/logger';
import { errorHandler } from './v2/infrastructure/middlewares/errorHandler';

app.use('/api', v2Router); // Centraliza todos os endpoints (RCAs, Gatilhos, Ações, etc.) na arquitetura V2
app.use(errorHandler); // Intercepta erros lancados de forma sincrona do V2 Router

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
        logger.info('✅ Conexão com o banco de dados inicializada');

        // Execução de Migrações (Criação de tabelas e atualizações de schema)
        const { MigrationRunner } = await import('./v2/infrastructure/database/MigrationRunner');
        await new MigrationRunner().run();

        /**
         * Inicialização do Servidor MCP (Internal IA Integration)
         */
        const { McpServer } = await import('./v2/infrastructure/mcp/McpServer');
        const mcpServer = new McpServer();

        app.get('/api/mcp/sse', (req, res) => mcpServer.handleSse(req, res));
        app.post('/api/mcp/message', (req, res) => mcpServer.handleMessage(req, res));
        logger.info('🔌 Servidor MCP (IA Bridge) pronto em /api/mcp/sse');

        app.listen(PORT, () => {
            logger.info(`🚀 Servidor rodando em http://localhost:${PORT}`);
            logger.info(`📡 Endpoints disponíveis:`);
            logger.info(`   GET  /api/health`);
            logger.info(`   CRUD /api/rcas`);
            logger.info(`   CRUD /api/triggers`);
            logger.info(`   CRUD /api/actions`);
            logger.info(`   GET/PUT /api/taxonomy`);
            logger.info(`   CRUD /api/assets`);
            logger.info(`   MCP  /api/mcp/sse`);
        });
    } catch (error) {
        logger.error('❌ Erro crítico ao iniciar servidor:', { error });
        process.exit(1);
    }
};

/**
 * Hook de desligamento suave (Graceful Shutdown).
 * Garante que dados em memória (debounce de escrita) sejam persistidos no disco antes de encerrar o processo.
 */
const handleShutdown = () => {
    logger.info('\n[Servidor] 🛑 Encerrando processo...');
    try {
        const { DatabaseConnection } = require('./v2/infrastructure/database/DatabaseConnection');
        DatabaseConnection.getInstance().flush();
        logger.info('[Servidor] ✅ Base de dados persistida com sucesso.');
        process.exit(0);
    } catch (err) {
        logger.error('[Servidor] ❌ Erro ao persistir base de dados no encerramento:', { error: err });
        process.exit(1);
    }
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

startServer();