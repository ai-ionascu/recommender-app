import catchAsync from '../utils/catchAsync.js';
import { OrderService } from '../services/order.service.js';

export const OrderController = {
  checkout: catchAsync(async (req, res) => {
    const bearer = req.headers.authorization || null;
    const order = await OrderService.checkout(req.user.id, bearer);
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
