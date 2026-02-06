// Servidor Express - RCA System API
// Ponto de entrada principal do backend

import express from 'express';
import cors from 'cors';
import { DatabaseConnection } from './v2/infrastructure/database/DatabaseConnection';

// V1 Routes removed - migrated to V2 architecture

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rotas da API
import v2Router from './v2/routes';
app.use('/api', v2Router); // ALL V2 ROUTES (RCAs, Triggers, Actions, etc.)

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
        // Initialize V2 Database Connection
        const { DatabaseConnection } = await import('./v2/infrastructure/database/DatabaseConnection');
        await DatabaseConnection.getInstance().initialize();
        console.log('✅ V2 Database Connection initialized');

        // Run Migrations (Create Tables if not exist)
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
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};

startServer();
