import { Router } from 'express';
import { RcaController } from '../controllers/RcaController';

const router = Router();
const controller = new RcaController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

// Bulk operations
router.post('/bulk', controller.bulkImport);
router.post('/bulk-delete', controller.bulkDelete);

export default router;
