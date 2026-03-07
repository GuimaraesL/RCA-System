import express, { Router } from 'express';
import { MediaController } from '../controllers/MediaController';
import { authMiddleware } from '../../infrastructure/middlewares/AuthMiddleware';

const router = Router();
const controller = new MediaController();

// Todas as rotas de mídia exigem autenticação
router.use(authMiddleware);

// Configuração para aceitar corpo bruto (binary) nos uploads de mídia
// Isso permite enviar arquivos sem depender de bibliotecas externas como multer neste momento.
const rawParser = express.raw({ type: '*/*', limit: '50mb' });

router.post('/upload/:rcaId', rawParser, controller.upload);
router.get('/rca/:rcaId', controller.listByRca);
router.get('/:rcaId/:filename', controller.serve);
router.delete('/:rcaId/:filename', controller.delete);

export default router;
