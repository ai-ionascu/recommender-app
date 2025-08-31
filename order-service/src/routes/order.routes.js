import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { PaymentController } from '../controllers/payment.controller.js';

const router = Router();

// POST /orders/checkout
router.post('/checkout', OrderController.checkout);

// GET /orders (user: own / admin: all)
router.get('/', OrderController.list);

// GET /orders/:id
router.get('/:id', OrderController.getOne);

// Create/ensure PaymentIntent
router.post('/:id/pay', PaymentController.createIntent);

export default router;
