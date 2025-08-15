import catchAsync from '../utils/catchAsync.js';
import { PaymentService } from '../services/payment.service.js';

export const PaymentController = {
  createIntent: catchAsync(async (req, res) => {
    const idempotencyKey = req.get('Idempotency-Key') || null;
    const data = await PaymentService.createPaymentIntent(req.params.id, req.user, idempotencyKey);
    res.status(201).json(data);
  }),

  webhook: catchAsync(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const result = await PaymentService.handleStripeWebhook({
      rawBody: req.rawBody,                 // vezi middleware-ul din route
      signature,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    });
    res.json(result);
  })
};
