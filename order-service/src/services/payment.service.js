// order-service/src/services/payment.service.js
import { stripe, STRIPE_CURRENCY } from '../config/stripe.js';
import { AppError } from '../utils/errors.js';
import { Order } from '../models/order.mongo.js';
import { Payment } from '../models/payment.mongo.js';
import { ProcessedEvent } from '../models/processedEvent.mongo.js';
import { publishEvent } from '../config/rabbit.js';
import { Cart } from '../models/cart.mongo.js';

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
   * Ensure a PaymentIntent for a given order:
   * - Uses order.subtotal as the source of truth for amount
   * - Reuses/updates PI when safe; cancels & recreates in edge states
   * - Syncs the Payment collection and pins PI on Order (stripePaymentIntentId)
   */
  async ensurePaymentIntent(orderId, requester, idempotencyKeyFromHeader) {
    // Normalize orderId input
    let normalizedOrderId = orderId;
    if (!normalizedOrderId) throw new AppError('orderId is required.', 400);
    if (typeof normalizedOrderId === 'object') {
      normalizedOrderId = normalizedOrderId._id ?? normalizedOrderId.id ?? normalizedOrderId.orderId ?? null;
    }
    if (!normalizedOrderId || (typeof normalizedOrderId !== 'string' && typeof normalizedOrderId !== 'number')) {
      throw new AppError('Invalid order identifier passed to ensurePaymentIntent', 400);
    }

    const ord = await Order.findById(normalizedOrderId);
    if (!ord) throw new AppError('Order not found.', 404);

    const requesterId = pickUserId(requester);
    if (!requesterId) throw new AppError('Unauthorized', 401);

    const isAdmin = String(requester?.role)?.toLowerCase() === 'admin';
    if (!isAdmin && String(ord.userId) !== requesterId) {
      throw new AppError('Forbidden', 403);
    }

    if (ord.status === 'paid') throw new AppError('Order already paid.', 409);
    if (ord.status === 'cancelled') throw new AppError('Order cancelled.', 409);

    const amount = toStripeAmount(ord.subtotal);
    const currency = normalizeCurrency(ord.currency);
    if (!amount || amount < 1) {
      throw new AppError(`Invalid order amount (${amount})`, 400);
    }

    // Helpers
    const createPI = async () => {
      const options = idempotencyKeyFromHeader ? { idempotencyKey: idempotencyKeyFromHeader } : undefined;
      const pi = await stripe.paymentIntents.create(
        {
          amount,
          currency,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          metadata: { orderId: String(ord._id), userId: requesterId }
        },
        options
      );
      return pi;
    };

    const updatePIAmount = async (piId) => stripe.paymentIntents.update(piId, { amount });

    // Try to reuse existing PI from our Payment doc
    const existingPay = await Payment.findOne({ orderId: ord._id }).lean();
    let intent = null;

    if (existingPay?.intentId) {
      try {
        intent = await stripe.paymentIntents.retrieve(existingPay.intentId);
      } catch {
        intent = null; // Invalid/missing on Stripe side → create fresh
      }
    }

    // Decide on create/update
    if (!intent || ['succeeded', 'canceled'].includes(intent.status)) {
      intent = await createPI();
    } else if (Number(intent.amount) !== amount) {
      if (['requires_payment_method', 'requires_confirmation'].includes(intent.status)) {
        intent = await updatePIAmount(intent.id);
      } else {
        try { await stripe.paymentIntents.cancel(intent.id); } catch { /* ignore */ }
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
          amount: Number(ord.subtotal),
          currency: currency.toUpperCase(),
          raw: intent
        }
      },
      { upsert: true }
    );

    // Pin the active PI on the Order
    await Order.updateOne(
      { _id: ord._id },
      {
        $set: {
          status: 'pending_payment',
          stripePaymentIntentId: intent.id
        }
      }
    );

    return {
      orderId: String(ord._id),
      amount: Number(ord.subtotal),
      currency: currency.toUpperCase(),
      client_secret: intent.client_secret,
      intent_status: intent.status,
      intent_id: intent.id
    };
  },

  /**
   * Stripe webhook handler: marks the order paid only if the PI id matches the
   * active one on the order (stripePaymentIntentId). Also clears the user's cart
   * and publishes "order.paid".
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
        // Safety: only mark paid if matches active PI pinned on the order
        const ord = await Order.findById(orderId).lean();
        if (ord && (!ord.stripePaymentIntentId || ord.stripePaymentIntentId === pi.id)) {
          await Payment.updateOne(
            { intentId: pi.id },
            { $set: { status: 'succeeded', raw: event } },
            { upsert: true }
          );

          await Order.updateOne({ _id: orderId }, { $set: { status: 'paid' } });

          // Clear the user's cart
          try {
            await Cart.updateOne({ userId: ord.userId }, { $set: { items: [] } });
          } catch (e) {
            console.warn('[webhook] Failed to clear cart after payment', e?.message);
          }

          // Publish order.paid
          const payload = {
            event: 'order.paid',
            version: 1,
            at: new Date().toISOString(),
            orderId: String(ord._id),
            userId: ord.userId,
            currency: ord.currency,
            total: Number(ord.subtotal),
            items: (ord.items || []).map(i => ({
              productId: i.productId,
              qty: i.qty,
              price: Number(i.price)
            }))
          };
          await publishEvent('order.paid', payload);
        }
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

  async syncPaymentFromStripe(orderId, requester) {
    const ord = await Order.findById(orderId);
    if (!ord) throw new AppError('Order not found.', 404);
    const isAdmin = String(requester?.role).toLowerCase() === 'admin';
    if (!isAdmin && String(ord.userId) !== String(requester.id)) {
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

    const matchesActivePI = !ord?.stripePaymentIntentId || ord.stripePaymentIntentId === pi.id;

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
        total: Number(updated.subtotal),
        items: (updated.items || []).map(i => ({
          productId: i.productId,
          qty: i.qty,
          price: Number(i.price)
        }))
      });

      return { orderId: String(updated._id), order_status: 'paid', intent_status: intentStatus };
    }

    return { orderId: String(ord._id), order_status: ord.status, intent_status: intentStatus };
  },

  // Backward-compat alias
  async createPaymentIntent(orderId, requester, idempotencyKeyFromHeader) {
    return this.ensurePaymentIntent(orderId, requester, idempotencyKeyFromHeader);
  }
};
