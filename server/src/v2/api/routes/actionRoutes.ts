import { Router } from 'express';
import { ActionController } from '../controllers/ActionController';
import { authMiddleware } from '../../infrastructure/middlewares/AuthMiddleware';
import { rbacMiddleware } from '../../infrastructure/middlewares/RbacMiddleware';

const router = Router();
const controller = new ActionController();

// Todas as rotas de Ações exigem autenticação
router.use(authMiddleware);

// Rotas de Leitura
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Rotas de Escrita (Engenheiro ou Administrador)
const canWrite = rbacMiddleware(['Engenheiro', 'Administrador']);

router.post('/', canWrite, controller.create);
router.post('/bulk', canWrite, controller.bulkImport);
router.post('/bulk-delete', canWrite, controller.bulkDelete);
router.put('/:id', canWrite, controller.update);
router.delete('/:id', canWrite, controller.delete);

export default router;