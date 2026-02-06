import { Router } from 'express';
import { TaxonomyController } from '../controllers/TaxonomyController';

const router = Router();
const controller = new TaxonomyController();

router.get('/', controller.get);
router.put('/', controller.update);

export default router;
