// order-service/src/services/order.service.js
import { Order } from '../models/order.mongo.js';
import { AppError } from '../utils/errors.js';
import { PaymentService } from './payment.service.js';
import { validateShipping } from '../utils/validateShipping.js';

// Defensive number parser
function toNumber(n) {
  const v = Number(n);
  return Number.isNaN(v) ? null : v;
}

export const OrderService = {
  /**
   * Creates or updates a pending order for the user using the current server-side cart.
   * - Validates and saves the shipping address
   * - Copies cart line items into the order (price = priceSnapshot at checkout time)
   * - Ensures/updates a Stripe PaymentIntent and pins its id on the order
   */
  async checkout({ userId, userEmail, cart, shipping }) {
    const normalizedShipping = validateShipping(shipping);

    // Compute subtotal from cart items (cart uses priceSnapshot)
    const subtotal = (cart?.items || []).reduce((sum, it) => {
      const p = toNumber(it.priceSnapshot);
      const q = toNumber(it.qty);
      return sum + (p && q ? p * q : 0);
    }, 0);

    if (!cart?.items || cart.items.length === 0 || !subtotal || subtotal <= 0) {
      throw new AppError('Cart is empty or total amount is zero.', 400);
    }

    // Shape order items (we keep name/image optional; schema does not require them)
    const orderItems = (cart.items || []).map(it => ({
      productId: String(it.productId),
      name: it.name || '',          // optional
      image: it.image || '',        // optional
      price: toNumber(it.priceSnapshot) ?? 0,
      qty: toNumber(it.qty) ?? 0
    }));

    // Upsert a single pending order for this user
    let order = await Order.findOne({ userId, status: 'pending_payment' });
    if (order) {
      order.items = orderItems;
      order.subtotal = subtotal;
      order.currency = order.currency || 'eur';
      order.shipping = normalizedShipping;
      if (userEmail && !order.userEmail) order.userEmail = userEmail;
      await order.save();
    } else {
      order = await Order.create({
        userId,
        userEmail: userEmail || undefined,
        status: 'pending_payment',
        items: orderItems,
        subtotal,
        currency: 'eur',
        shipping: normalizedShipping
      });
    }

    // Ensure a Stripe PaymentIntent exists and matches the current amount
    const requester = { id: userId, role: 'user' };
    const pi = await PaymentService.ensurePaymentIntent(String(order._id), requester, null);

    // Persist PI id on order (field name in the model is stripePaymentIntentId)
    if (pi?.intent_id) {
      order.stripePaymentIntentId = pi.intent_id;
      await order.save();
    }

    return {
      orderId: String(order._id),
      clientSecret: pi?.client_secret ?? null,
      order: order.toObject ? order.toObject() : order
    };
  },

  async getOrder(orderId, requester) {
    const ord = await Order.findById(orderId).lean();
    if (!ord) throw new AppError('Order not found.', 404);
    const isAdmin = String(requester?.role).toLowerCase() === 'admin';
    if (!isAdmin && ord.userId !== requester.id) {
      throw new AppError('Forbidden', 403);
    }
    return ord;
  },

  async listPaged(requester, { limit = 20, offset = 0, status, sort = '-createdAt' }) {
    const filter = String(requester?.role).toLowerCase() === 'admin'
      ? {}
      : { userId: requester.id };
    if (status) filter.status = status;

    // Whitelist sorts
    const allowedSort = new Set(['createdAt', '-createdAt', 'subtotal', '-subtotal', 'status', '-status']);
    const sortExp = allowedSort.has(sort) ? sort : '-createdAt';

    const [items, total] = await Promise.all([
      Order.find(filter).sort(sortExp).skip(offset).limit(limit).lean(),
      Order.countDocuments(filter)
    ]);

    return { items, total, limit, offset, sort: sortExp };
  }
};
