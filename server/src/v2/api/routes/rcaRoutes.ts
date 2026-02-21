import { Router } from 'express';
import { RcaController } from '../controllers/RcaController';
import { authMiddleware } from '../../infrastructure/middlewares/AuthMiddleware';
import { rbacMiddleware } from '../../infrastructure/middlewares/RbacMiddleware';

const router = Router();
const controller = new RcaController();

// Todas as rotas de RCA exigem autenticação
router.use(authMiddleware);

// Rotas de Leitura
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Rotas de Escrita (Engenheiro ou Administrador)
const canWrite = rbacMiddleware(['Engenheiro', 'Administrador']);

router.post('/', canWrite, controller.create);
router.put('/:id', canWrite, controller.update);
router.delete('/:id', canWrite, controller.delete);

// Operações em lote (Bulk)
router.post('/bulk', canWrite, controller.bulkImport);
router.post('/bulk-delete', canWrite, controller.bulkDelete);

export default router;