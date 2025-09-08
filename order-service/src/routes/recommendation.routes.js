import { Router } from 'express';
import { RecommendationController } from '../controllers/recommendation.controller.js';

const router = Router();

router.get('/internal/copurchase/:productId', RecommendationController.coPurchase);

export default router;
