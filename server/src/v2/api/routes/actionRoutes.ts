/**
 * Proposta: Definição de rotas HTTP para a entidade Action (Planos de Ação).
 */

import { Router } from 'express';
import { ActionController } from '../controllers/ActionController';

const router = Router();
const controller = new ActionController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/bulk', controller.bulkImport);
router.post('/bulk-delete', controller.bulkDelete);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;