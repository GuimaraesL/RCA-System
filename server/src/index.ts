// Servidor Express - RCA System API
// Ponto de entrada principal do backend

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database';

// Importar rotas
import rcasRouter from './routes/rcas';
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
app.use('/api/rcas', rcasRouter);
app.use('/api/triggers', triggersRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/taxonomy', taxonomyRouter);
app.use('/api/assets', assetsRouter);

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicializar banco e servidor (async para sql.js)
const startServer = async () => {
    try {
        await initDatabase();
        console.log('✅ Banco de dados inicializado');

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
