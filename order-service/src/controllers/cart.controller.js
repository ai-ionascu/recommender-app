import catchAsync from '../utils/catchAsync.js';
import { CartService } from '../services/cart.service.js';

export const CartController = {
  getCart: catchAsync(async (req, res) => {
    const out = await CartService.getOrCreateCart(req.user.id);
    res.json(out);
  }),

  addItem: catchAsync(async (req, res) => {
    const { productId, qty } = req.body || {};
    const bearer = req.headers.authorization || null;
    const out = await CartService.addItem(req.user.id, Number(productId), qty, bearer);
    res.status(201).json(out);
  }),

  updateItem: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { qty } = req.body || {};
    const bearer = req.headers.authorization || null;
    const out = await CartService.updateItemQty(req.user.id, id, qty, bearer);
    res.json(out);
  }),

  removeItem: catchAsync(async (req, res) => {
    const { id } = req.params;
    const out = await CartService.removeItem(req.user.id, id);
    res.status(200).json(out);
  }),

  clear: catchAsync(async (req, res) => {
    const out = await CartService.clearCart(req.user.id);
    res.status(200).json(out);
  })
};
