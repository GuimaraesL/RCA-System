import { Router } from 'express';
import rcaRoutes from './rcaRoutes';
import actionRoutes from './actionRoutes';
import triggerRoutes from './triggerRoutes';
import assetRoutes from './assetRoutes';
import taxonomyRoutes from './taxonomyRoutes';

const router = Router();

router.use('/rcas', rcaRoutes);
router.use('/actions', actionRoutes);
router.use('/triggers', triggerRoutes);
router.use('/assets', assetRoutes);
router.use('/taxonomy', taxonomyRoutes);

export default router;
