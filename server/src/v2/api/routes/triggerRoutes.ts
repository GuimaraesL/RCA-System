import { Router } from 'express';
import { TriggerController } from '../controllers/TriggerController';
import { authMiddleware } from '../../infrastructure/middlewares/AuthMiddleware';
import { rbacMiddleware } from '../../infrastructure/middlewares/RbacMiddleware';

const router = Router();
const controller = new TriggerController();

// Todas as rotas de Gatilhos exigem autenticação
router.use(authMiddleware);

// Qualquer usuário autenticado pode ler e criar gatilhos (ajustável conforme necessidade)
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);

// Operações restritas (Engenheiro/Admin)
const canManage = rbacMiddleware(['Engenheiro', 'Administrador']);
router.put('/:id', canManage, controller.update);
router.delete('/:id', canManage, controller.delete);
router.post('/bulk', canManage, controller.bulkImport);
router.post('/bulk-delete', canManage, controller.bulkDelete);

export default router;