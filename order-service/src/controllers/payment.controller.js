import catchAsync from "../utils/catchAsync.js";
import { PaymentService } from "../services/payment.service.js";

export const PaymentController = {
  createIntent: catchAsync(async (req, res) => {
    const orderId = req.params.id ?? req.body?.orderId ?? null;
    if (!orderId) return res.status(400).json({ error: "order id missing" });
    
    const idempotencyKey = req.get("Idempotency-Key") || null;
    // Call the canonical method; alias exists for backward compatibility anyway
    const data = await PaymentService.ensurePaymentIntent(
      orderId,
      req.user,
      idempotencyKey
    );

    res.status(201).json(data);
  }),

  webhook: catchAsync(async (req, res) => {
    // Depending on router mounting we may have raw body in req.rawBody or req.body (Buffer)
    const rawBody = req.rawBody ?? req.body;
    const signature = req.headers["stripe-signature"];
    if (!rawBody || !signature) {
      return res.status(400).json({ error: "invalid webhook payload" });
    }
    await PaymentService.handleStripeWebhook({
      rawBody,
      signature,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    res.status(200).json({ received: true });
  }),
};
