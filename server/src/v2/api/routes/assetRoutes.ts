/**
 * Proposta: Definição de rotas HTTP para a entidade Asset (Ativos).
 */

import { Router } from 'express';
import { AssetController } from '../controllers/AssetController';

const router = Router();
const controller = new AssetController();

router.get('/', controller.getTree);
router.get('/flat', controller.getFlat);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/bulk', controller.bulkImport);
router.post('/bulk-delete', controller.bulkDelete);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;