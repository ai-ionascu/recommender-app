import mongoose from 'mongoose';
import { Cart } from '../models/cart.mongo.js';
import { Order } from '../models/order.mongo.js';
import { AppError } from '../utils/errors.js';
import { fetchProduct } from './productClient.js';

function toNum(n){ const v = Number(n); return Number.isNaN(v) ? null : v; }

export const OrderService = {
  async checkout(userId, bearer) {
    // IMPORTANT: Do NOT clear the cart here. We will clear it only after payment is confirmed (webhook).
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const cart = await Cart.findOne({ userId }).session(session);
      if (!cart || cart.items.length === 0) throw new AppError('Cart is empty.', 400);

      // Validate stock & recompute total (fresh pricing)
      const validated = [];
      let total = 0;

      for (const it of cart.items) {
        const product = await fetchProduct(it.productId, bearer);
        if (!product?.id) throw new AppError(`Product ${it.productId} not found.`, 404);
        const stock = toNum(product.stock);
        const priceNow = toNum(product.price);
        if (stock == null || stock < it.qty) throw new AppError(`Insufficient stock for product ${it.productId}.`, 409);
        if (priceNow == null || priceNow < 0) throw new AppError(`Invalid price for product ${it.productId}.`, 400);
        validated.push({ productId: it.productId, qty: it.qty, price: priceNow });
        total += priceNow * it.qty;
      }

      // Upsert a single pending order for this user:
      // - If an order is already pending_payment, update items/total.
      // - Otherwise, create a new one.
      let order = await Order.findOne({ userId, status: 'pending_payment' }).session(session);

      if (order) {
        order.items = validated;
        order.totalAmount = total;
        order.currency = 'EUR';
        // status stays 'pending_payment'
        await order.save({ session });
      } else {
        [order] = await Order.create([{
          userId,
          status: 'pending_payment',
          currency: 'EUR',
          totalAmount: total,
          items: validated
        }], { session });
      }

      await session.commitTransaction();
      const full = await Order.findById(order._id).lean();
      return full;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  },

  async getOrder(orderId, requester) {
    const ord = await Order.findById(orderId).lean();
    if (!ord) throw new AppError('Order not found.', 404);
    if (requester.role !== 'admin' && ord.userId !== requester.id) {
      throw new AppError('Forbidden', 403);
    }
    return ord;
  },

  async listPaged(requester, { limit = 20, offset = 0, status, sort = '-createdAt' }) {
    const filter = requester.role === 'admin' ? {} : { userId: requester.id };
    if (status) filter.status = status;

    // sanitize sort (accepting only known fields)
    const allowedSort = new Set(['createdAt', '-createdAt', 'totalAmount', '-totalAmount', 'status', '-status']);
    const sortExp = allowedSort.has(sort) ? sort : '-createdAt';

    const [items, total] = await Promise.all([
      Order.find(filter).sort(sortExp).skip(offset).limit(limit).lean(),
      Order.countDocuments(filter)
    ]);

    return { items, total, limit, offset, sort: sortExp };
  }
};
