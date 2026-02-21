import { Router } from 'express';
import { TaxonomyController } from '../controllers/TaxonomyController';
import { authMiddleware } from '../../infrastructure/middlewares/AuthMiddleware';
import { rbacMiddleware } from '../../infrastructure/middlewares/RbacMiddleware';

const router = Router();
const controller = new TaxonomyController();

// Todas as rotas de Taxonomia exigem autenticação
router.use(authMiddleware);

// Leitura livre para usuários autenticados
router.get('/', controller.get);

// Escrita restrita ao Administrador
router.put('/', rbacMiddleware(['Administrador']), controller.update);

export default router;