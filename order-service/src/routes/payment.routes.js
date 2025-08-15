import { Router } from 'express';
import express from 'express';
import { PaymentController } from '../controllers/payment.controller.js';

const router = Router();

// Webhook - no auth, raw body
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  // save rawBody for signature verification
  req.rawBody = req.body;
  next();
}, PaymentController.webhook);

export default router;
