import { AppError } from '../utils/errors.js';
import { Cart } from '../models/cart.mongo.js';
import { fetchProduct } from './productClient.js';

function toNumber(n) { const x = Number(n); return Number.isNaN(x) ? null : x; }

export const CartService = {
  async getOrCreateCart(userId) {
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { upsert: true, new: true }
    ).lean();

    const totals = (cart.items || []).reduce((acc, it) => acc + Number(it.priceSnapshot) * it.qty, 0);
    return { cart, items: cart.items, totals: { subtotal: totals } };
  },

  async addItem(userId, productId, qty, bearerToken) {
    const q = toNumber(qty);
    if (!q || q <= 0) throw new AppError('Quantity must be a positive integer.', 400);

    const product = await fetchProduct(productId, bearerToken);
    if (!product?.id) throw new AppError('Product not found.', 404);

    const price = toNumber(product.price);
    const stock = toNumber(product.stock);
    if (price == null || price < 0) throw new AppError('Invalid product price.', 400);
    if (stock == null || stock < 0) throw new AppError('Invalid product stock.', 400);

    // check if item is in the cart
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { upsert: true, new: true }
    );

    const existing = cart.items.find(it => it.productId === Number(productId));
    const newQty = (existing ? existing.qty : 0) + q;
    if (newQty > stock) throw new AppError('Insufficient stock for requested quantity.', 409);

    if (existing) {
      existing.qty = newQty;
      existing.priceSnapshot = price; // snapshot price at the time of addition
    } else {
      cart.items.push({ productId: Number(productId), qty: q, priceSnapshot: price });
    }

    await cart.save();

    const totals = cart.items.reduce((acc, it) => acc + Number(it.priceSnapshot) * it.qty, 0);
    return { cart: cart.toObject(), items: cart.items, totals: { subtotal: totals } };
  },

  async updateItemQty(userId, itemId, qty, bearerToken) {
    const q = toNumber(qty);
    if (!q || q <= 0) throw new AppError('Quantity must be a positive integer.', 400);

    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError('Cart not found.', 404);

    const item = cart.items.id(itemId);
    if (!item) throw new AppError('Item not found in your cart.', 404);

    const product = await fetchProduct(item.productId, bearerToken);
    const stock = toNumber(product?.stock);
    if (stock == null) throw new AppError('Invalid product stock.', 400);
    if (q > stock) throw new AppError('Insufficient stock for requested quantity.', 409);

    item.qty = q;
    await cart.save();

    const totals = cart.items.reduce((acc, it) => acc + Number(it.priceSnapshot) * it.qty, 0);
    return { cart: cart.toObject(), items: cart.items, totals: { subtotal: totals } };
  },

  async removeItem(userId, itemId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError('Cart not found.', 404);

    const item = cart.items.id(itemId);
    if (!item) throw new AppError('Item not found in your cart.', 404);

    item.deleteOne();
    await cart.save();

    const totals = cart.items.reduce((acc, it) => acc + Number(it.priceSnapshot) * it.qty, 0);
    return { cart: cart.toObject(), items: cart.items, totals: { subtotal: totals } };
  },

  async clearCart(userId) {
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { new: true }
    );
    if (!cart) return { cart: null, items: [], totals: { subtotal: 0 } };
    return { cart: cart.toObject(), items: [], totals: { subtotal: 0 } };
  }
};
