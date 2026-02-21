import { Router } from 'express';
import { AssetController } from '../controllers/AssetController';
import { authMiddleware } from '../../infrastructure/middlewares/AuthMiddleware';
import { rbacMiddleware } from '../../infrastructure/middlewares/RbacMiddleware';

const router = Router();
const controller = new AssetController();

// Todas as rotas de Ativos exigem autenticação
router.use(authMiddleware);

// Leitura livre para usuários autenticados
router.get('/', controller.getTree);
router.get('/flat', controller.getFlat);
router.get('/:id', controller.getById);

// Escrita restrita ao Administrador (Gestão de Ativos é crítica)
const onlyAdmin = rbacMiddleware(['Administrador']);

router.post('/', onlyAdmin, controller.create);
router.post('/bulk', onlyAdmin, controller.bulkImport);
router.post('/bulk-delete', onlyAdmin, controller.bulkDelete);
router.put('/:id', onlyAdmin, controller.update);
router.delete('/:id', onlyAdmin, controller.delete);

export default router;