/**
 * Proposta: Ponto central de agregação das rotas da API V2.
 * Fluxo: Organiza e expõe os diferentes módulos do sistema (RCAs, Ações, Gatilhos, Ativos, Taxonomia e FMEA) sob o prefixo comum da API.
 */

import { Router } from 'express';
import rcaRoutes from './rcaRoutes';
import actionRoutes from './actionRoutes';
import triggerRoutes from './triggerRoutes';
import assetRoutes from './assetRoutes';
import taxonomyRoutes from './taxonomyRoutes';
import fmeaRoutes from './fmeaRoutes';

const router = Router();

router.use('/rcas', rcaRoutes);
router.use('/actions', actionRoutes);
router.use('/triggers', triggerRoutes);
router.use('/assets', assetRoutes);
router.use('/taxonomy', taxonomyRoutes);
router.use('/fmea', fmeaRoutes);

export default router;