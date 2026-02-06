import { Router } from 'express';
import { TriggerController } from '../controllers/TriggerController';

const router = Router();
const controller = new TriggerController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

// Bulk operations
router.post('/bulk', controller.bulkImport);
router.post('/bulk-delete', controller.bulkDelete);

export default router;
