import catchAsync from '../utils/catchAsync.js';
import { OrderService } from '../services/order.service.js';
import { CartService } from '../services/cart.service.js';

export const OrderController = {

  checkout: catchAsync(async (req, res) => {
    // const bearer = req.headers.authorization || null;
    const { shipping } = req.body || {};

    // -> fetch current cart for this user (CartService returns { cart, items, totals })
    const cartPayload = await CartService.getOrCreateCart(req.user.id);
    const cart = cartPayload?.cart ?? { items: [] };

    // call service with the shape the service expects
    const order = await OrderService.checkout({
      userId: req.user.id,
      userEmail: req.user.email,   // <<- adăugăm
      cart,
      shipping
    });
    res.status(201).json(order);
  }),

  getOne: catchAsync(async (req, res) => {
    const order = await OrderService.getOrder(req.params.id, req.user);
    res.json(order);
  }),

  list: catchAsync(async (req, res) => {
    const {
      limit = '20',
      offset = '0',
      status,
      sort = '-createdAt' // ex: 'createdAt' or '-createdAt'
    } = req.query;

    const data = await OrderService.listPaged(req.user, {
      limit: Number(limit),
      offset: Number(offset),
      status,
      sort
    });

    res.json(data);
  })
};
