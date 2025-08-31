import catchAsync from "../utils/catchAsync.js";
import { PaymentService } from "../services/payment.service.js";

export const PaymentController = {
  createIntent: catchAsync(async (req, res) => {
    const idempotencyKey = req.get("Idempotency-Key") || null;

    // Call the canonical method; alias exists for backward compatibility anyway
    const data = await PaymentService.ensurePaymentIntent(
      req.params.id,
      req.user,
      idempotencyKey
    );

    res.status(201).json(data);
  }),

  webhook: catchAsync(async (req, res) => {
    // Depending on router mounting we may have raw body in req.rawBody or req.body (Buffer)
    const rawBody = req.rawBody ?? req.body;

    const signature = req.headers["stripe-signature"];
    await PaymentService.handleStripeWebhook({
      rawBody,
      signature,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    res.status(200).json({ received: true });
  }),
};
