import { Router } from 'express';
import { FmeaController } from '../controllers/FmeaController';
import { authMiddleware } from '../../infrastructure/middlewares/AuthMiddleware';
import { rbacMiddleware } from '../../infrastructure/middlewares/RbacMiddleware';

const router = Router();
const controller = new FmeaController();

// Todas as rotas de FMEA exigem autenticação
router.use(authMiddleware);

// Rotas de Leitura (Qualquer papel autenticado)
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/asset/:assetId', controller.getByAssetId);

// Rotas de Escrita (Engenheiro ou Administrador)
const canWrite = rbacMiddleware(['Engenheiro', 'Administrador']);

router.post('/', canWrite, controller.create);
router.put('/:id', canWrite, controller.update);
router.delete('/:id', canWrite, controller.delete);

export default router;
