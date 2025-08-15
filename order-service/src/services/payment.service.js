import { stripe, STRIPE_CURRENCY } from '../config/stripe.js';
import { AppError } from '../utils/errors.js';
import { Order } from '../models/order.mongo.js';
import { Payment } from '../models/payment.mongo.js';
import { ProcessedEvent } from '../models/processedEvent.mongo.js';
import { publishEvent } from '../config/rabbit.js';

function toStripeAmount(n){ return Math.round(Number(n) * 100); }

export const PaymentService = {
  async createPaymentIntent(orderId, requester, idempotencyKeyFromHeader) {
    const ord = await Order.findById(orderId);
    if (!ord) throw new AppError('Order not found.', 404);
    if (requester.role !== 'admin' && ord.userId !== requester.id) {
      throw new AppError('Forbidden', 403);
    }
    if (ord.status === 'paid') throw new AppError('Order already paid.', 409);
    if (ord.status === 'cancelled') throw new AppError('Order cancelled.', 409);

    const amount = toStripeAmount(ord.totalAmount);
    const currency = (ord.currency || STRIPE_CURRENCY).toLowerCase();
    
    const idempotencyKey = idempotencyKeyFromHeader
      || `order-${String(ord._id)}-${amount}-${currency}`;

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { orderId: String(ord._id), userId: requester.id },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
    }, { idempotencyKey });

    await Payment.updateOne(
      { orderId: ord._id },
      { $set: {
          provider: 'stripe_test',
          intentId: intent.id,
          status: intent.status,
          amount: ord.totalAmount,
          currency: currency.toUpperCase(),
          raw: intent
        } },
      { upsert: true }
    );

    if (ord.status !== 'pending_payment') {
      await Order.updateOne({ _id: ord._id }, { $set: { status: 'pending_payment' } });
    }

    return {
      orderId: String(ord._id),
      amount: ord.totalAmount,
      currency: currency.toUpperCase(),
      client_secret: intent.client_secret,
      intent_status: intent.status,
      intent_id: intent.id
    };
  },

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

        const ord = await Order.findById(orderId).lean();
        const payload = {
          event: 'order.paid',
          version: 1,
          at: new Date().toISOString(),
          orderId: String(ord._id),
          userId: ord.userId,
          currency: ord.currency,
          total: Number(ord.totalAmount),
          items: ord.items.map(i => ({ productId: i.productId, qty: i.qty, price: Number(i.price) }))
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
  }
};
