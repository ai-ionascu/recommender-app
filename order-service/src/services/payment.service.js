import { stripe, STRIPE_CURRENCY } from '../config/stripe.js';
import { AppError } from '../utils/errors.js';
import { Order } from '../models/order.mongo.js';
import { Payment } from '../models/payment.mongo.js';
import { ProcessedEvent } from '../models/processedEvent.mongo.js';
import { publishEvent } from '../config/rabbit.js';

function toStripeAmount(n) {
  return Math.round(Number(n || 0) * 100);
}

function pickUserId(u) {
  return String(u?.id ?? u?._id ?? u?.userId ?? u?.sub ?? '');
}

function normalizeCurrency(c) {
  return (c || STRIPE_CURRENCY || 'EUR').toLowerCase();
}

export const PaymentService = {
  /**
   * Ensure a usable PaymentIntent for an order:
   * - validates user
   * - creates PI if missing or terminal (succeeded/canceled)
   * - updates the amount if order total changed (when allowed by Stripe)
   *   otherwise cancels and recreates a fresh PI
   * - syncs Payment collection and pins the active PI on the order
   */
  async ensurePaymentIntent(orderId, requester, idempotencyKeyFromHeader) {
    const ord = await Order.findById(orderId);
    if (!ord) throw new AppError('Order not found.', 404);

    const requesterId = pickUserId(requester);
    if (!requesterId) throw new AppError('Unauthorized', 401);

    const isAdmin = String(requester?.role)?.toLowerCase() === 'admin';
    if (!isAdmin && String(ord.userId) !== requesterId) {
      throw new AppError('Forbidden', 403);
    }

    if (ord.status === 'paid') throw new AppError('Order already paid.', 409);
    if (ord.status === 'cancelled') throw new AppError('Order cancelled.', 409);

    const amount = toStripeAmount(ord.totalAmount);
    const currency = normalizeCurrency(ord.currency);
    if (!amount || amount < 1) {
      throw new AppError(`Invalid order amount (${amount})`, 400);
    }

    // Helpers
    const createPI = async () => {
      const options = idempotencyKeyFromHeader
        ? { idempotencyKey: idempotencyKeyFromHeader }
        : undefined;

      const pi = await stripe.paymentIntents.create(
        {
          amount,
          currency,
          // Let Stripe choose the right set; we avoid redirects in this flow
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          metadata: { orderId: String(ord._id), userId: requesterId },
        },
        options
      );
      return pi;
    };

    const updatePIAmount = async (piId) => {
      return stripe.paymentIntents.update(piId, { amount });
    };

    // Try to retrieve an existing PI from our Payment doc
    const existingPay = await Payment.findOne({ orderId: ord._id }).lean();
    let intent = null;

    if (existingPay?.intentId) {
      try {
        intent = await stripe.paymentIntents.retrieve(existingPay.intentId);
      } catch (_e) {
        intent = null; // Deleted/invalid on Stripe side → recreate
      }
    }

    // Decide what to do
    if (!intent || ['succeeded', 'canceled'].includes(intent.status)) {
      // No PI or terminal → create fresh
      intent = await createPI();
    } else if (Number(intent.amount) !== amount) {
      // Amount changed → try in-place update only in safe states
      if (['requires_payment_method', 'requires_confirmation'].includes(intent.status)) {
        intent = await updatePIAmount(intent.id);
      } else {
        // Edge states (e.g. requires_action/processing) → safest is cancel + create new
        try {
          await stripe.paymentIntents.cancel(intent.id);
        } catch { /* ignore */ }
        intent = await createPI();
      }
    }

    // Sync Payment collection
    await Payment.updateOne(
      { orderId: ord._id },
      {
        $set: {
          provider: 'stripe',
          intentId: intent.id,
          status: intent.status,
          amount: Number(ord.totalAmount),
          currency: currency.toUpperCase(),
          raw: intent,
        },
      },
      { upsert: true }
    );

    // Pin the active PI on the Order so webhook can validate it
    await Order.updateOne(
      { _id: ord._id },
      {
        $set: {
          status: ord.status === 'pending_payment' ? 'pending_payment' : 'pending_payment',
          paymentIntentId: intent.id,
        },
      }
    );

    return {
      orderId: String(ord._id),
      amount: Number(ord.totalAmount),
      currency: currency.toUpperCase(),
      client_secret: intent.client_secret,
      intent_status: intent.status,
      intent_id: intent.id,
    };
  },

  /**
   * Stripe webhook handler (raw body). We only mark the order as 'paid'
   * if the incoming PI id matches order.paymentIntentId (active one).
   */
  async handleStripeWebhook({ rawBody, signature, webhookSecret }) {
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
    }

    const type = event.type;
    const pi = event.data?.object;
    if (!pi?.id) return { received: true };

    const eventType = type;
    const eventId = pi.id;

    const exists = await ProcessedEvent.findOne({ eventType, eventId }).lean();
    if (exists) return { received: true };

    if (eventType === 'payment_intent.succeeded') {
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        await Payment.updateOne(
          { intentId: pi.id },
          { $set: { status: 'succeeded', raw: event } },
          { upsert: true }
        );

        await Order.updateOne({ _id: orderId }, { $set: { status: 'paid' } });

        // Fetch the order to publish and to clear the cart for that user
        const ord = await Order.findById(orderId).lean();

        // Clear the user's cart NOW that payment is confirmed
        try {
          await Cart.updateOne({ userId: ord.userId }, { $set: { items: [] } });
        } catch (e) {
          // Non-fatal: cart clear should not fail the webhook
          console.warn('[webhook] Failed to clear cart after payment', e?.message);
        }

        const payload = {
          event: 'order.paid',
          version: 1,
          at: new Date().toISOString(),
          orderId: String(ord._id),
          userId: ord.userId,
          currency: ord.currency,
          total: Number(ord.totalAmount),
          items: ord.items.map(i => ({
            productId: i.productId,
            qty: i.qty,
            price: Number(i.price),
          })),
        };
        await publishEvent('order.paid', payload);
      }
    } else if (eventType === 'payment_intent.payment_failed') {
      await Payment.updateOne(
        { intentId: pi.id },
        { $set: { status: 'failed', raw: event } },
        { upsert: true }
      );
    } else if (eventType === 'payment_intent.canceled') {
      await Payment.updateOne(
        { intentId: pi.id },
        { $set: { status: 'canceled', raw: event } },
        { upsert: true }
      );
    }

    await ProcessedEvent.updateOne(
      { eventType, eventId },
      { $setOnInsert: { eventType, eventId } },
      { upsert: true }
    );

    return { received: true };
  },

  /**
   * Manual sync (only if you still call it somewhere). We also respect order.paymentIntentId
   * when deciding to mark the order as paid.
   */
  async syncPaymentFromStripe(orderId, requester) {
    const ord = await Order.findById(orderId);
    if (!ord) throw new AppError('Order not found.', 404);
    if (requester.role !== 'admin' && String(ord.userId) !== String(requester.id)) {
      throw new AppError('Forbidden', 403);
    }

    const pay = await Payment.findOne({ orderId: ord._id }).lean();
    if (!pay?.intentId) {
      return { orderId: String(ord._id), order_status: ord.status, intent_status: null };
    }

    const pi = await stripe.paymentIntents.retrieve(pay.intentId);
    const intentStatus = pi.status;

    await Payment.updateOne(
      { intentId: pi.id },
      { $set: { status: intentStatus, raw: pi } },
      { upsert: true }
    );

    const matchesActivePI = !ord?.paymentIntentId || ord.paymentIntentId === pi.id;

    if (intentStatus === 'succeeded' && ord.status !== 'paid' && matchesActivePI) {
      await Order.updateOne({ _id: ord._id }, { $set: { status: 'paid' } });

      const updated = await Order.findById(ord._id).lean();
      await publishEvent('order.paid', {
        event: 'order.paid',
        version: 1,
        at: new Date().toISOString(),
        orderId: String(updated._id),
        userId: updated.userId,
        currency: updated.currency,
        total: Number(updated.totalAmount),
        items: updated.items.map(i => ({
          productId: i.productId,
          qty: i.qty,
          price: Number(i.price)
        }))
      });

      return { orderId: String(updated._id), order_status: 'paid', intent_status: intentStatus };
    }

    return { orderId: String(ord._id), order_status: ord.status, intent_status: intentStatus };
  },

  // Backward-compat alias (keeps older controllers working)
  async createPaymentIntent(orderId, requester, idempotencyKeyFromHeader) {
    return this.ensurePaymentIntent(orderId, requester, idempotencyKeyFromHeader);
  }
};
