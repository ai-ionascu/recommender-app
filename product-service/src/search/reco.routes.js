import { Router } from 'express';
import { RecoController } from './reco.controller.js';

const router = Router();

// Content-based
router.get('/reco/similar/:productId', RecoController.similar);

// Frequently Bought Together (placeholder for now)
router.get('/reco/fbt/:productId', RecoController.fbt);

export default router;
