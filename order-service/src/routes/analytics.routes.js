import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';

const router = Router();

// All endpoints require an authenticated user; controller limits to admin
router.get('/summary', AnalyticsController.summary);
router.get('/sales-daily', AnalyticsController.salesDaily);
router.get('/top-products', AnalyticsController.topProducts);
router.get('/top-customers', AnalyticsController.topCustomers);

export default router;
