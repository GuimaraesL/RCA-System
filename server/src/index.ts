// Servidor Express - RCA System API
// Ponto de entrada principal do backend

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database';

// Importar rotas
import triggersRouter from './routes/triggers';
import actionsRouter from './routes/actions';
import taxonomyRouter from './routes/taxonomy';
import assetsRouter from './routes/assets';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rotas da API
// V1 RCAs Removed
import v2RcasRouter from './v2/routes';
app.use('/api/rcas', v2RcasRouter); // V2 LIVE

app.use('/api/triggers', triggersRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/taxonomy', taxonomyRouter);
app.use('/api/assets', assetsRouter);

// V2 Route Mounting (Legacy/Dual stack reference removed as it's now main)
// import v2Routes from './v2/routes';
// app.use('/api/v2/rcas', v2Routes);

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicializar banco e servidor (async para sql.js)
const startServer = async () => {
    try {
        await initDatabase();
        console.log('✅ Banco de dados inicializado');

        // BRIDGE V1 -> V2
        // Share the same in-memory database instance to avoid split-brain
        const { getDatabase } = await import('./db/database');
        const { DatabaseConnection } = await import('./v2/infrastructure/database/DatabaseConnection');

        const v1Db = getDatabase();
        DatabaseConnection.getInstance().setRawDatabase(v1Db);
        console.log('🔗 V1 Database bridged to V2 architecture');

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
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};

startServer();
