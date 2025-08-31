import { Router } from 'express';
import express from 'express';
import { PaymentController } from '../controllers/payment.controller.js';

const router = Router();

// Stripe webhook – raw body, no auth. MUST be mounted before JSON parser.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    // keep a copy for controller
    req.rawBody = req.body;
    next();
  },
  PaymentController.webhook
);

export default router;
