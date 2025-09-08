import { Order } from '../models/order.mongo.js';
import { AppError } from '../utils/errors.js';

function ensureAdmin(req) {
  const role = String(req?.user?.role || '').toLowerCase();
  if (role !== 'admin') throw new AppError('Forbidden', 403);
}

function parseRange(q) {
  const now = new Date();
  const to = q.to ? new Date(q.to) : now;
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  // normalize to day bounds
  const fromStart = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0));
  const toEnd = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999));
  return { from: fromStart, to: toEnd };
}

export const AnalyticsController = {
  async summary(req, res, next) {
    try {
      ensureAdmin(req);
      const { from, to } = parseRange(req.query);

      const [row] = await Order.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: from, $lte: to } } },
        {
          $facet: {
            itemsAgg: [
              { $unwind: '$items' },
              {
                $group: {
                  _id: null,
                  revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                  items: { $sum: '$items.qty' }
                }
              }
            ],
            ordersAgg: [
              {
                $group: {
                  _id: null,
                  orders: { $sum: 1 },
                  customers: { $addToSet: '$userEmail' }
                }
              }
            ]
          }
        },
        {
          $project: {
            revenue: { $ifNull: [{ $arrayElemAt: ['$itemsAgg.revenue', 0] }, 0] },
            items: { $ifNull: [{ $arrayElemAt: ['$itemsAgg.items', 0] }, 0] },
            orders: { $ifNull: [{ $arrayElemAt: ['$ordersAgg.orders', 0] }, 0] },
            customers: {
              $size: {
                $ifNull: [{ $arrayElemAt: ['$ordersAgg.customers', 0] }, []]
              }
            }
          }
        },
        {
          $addFields: {
            aov: {
              $cond: [
                { $gt: ['$orders', 0] },
                { $divide: ['$revenue', '$orders'] },
                0
              ]
            }
          }
        }
      ]);

      res.json({
        from,
        to,
        revenue: Number(row?.revenue || 0),
        orders: Number(row?.orders || 0),
        items: Number(row?.items || 0),
        customers: Number(row?.customers || 0),
        aov: Number(row?.aov || 0),
      });
    } catch (err) {
      next(err);
    }
  },

  async salesDaily(req, res, next) {
    try {
      ensureAdmin(req);
      const { from, to } = parseRange(req.query);

      const rows = await Order.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: from, $lte: to } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            ordersSet: { $addToSet: '$_id' }
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            revenue: 1,
            orders: { $size: '$ordersSet' }
          }
        },
        { $sort: { date: 1 } }
      ]);

      res.json({ from, to, items: rows });
    } catch (err) {
      next(err);
    }
  },

  async topProducts(req, res, next) {
    try {
      ensureAdmin(req);
      const { from, to } = parseRange(req.query);
      const limit = Number(req.query.limit || 10);

      const rows = await Order.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: from, $lte: to } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            qty: { $sum: '$items.qty' }
          }
        },
        { $sort: { revenue: -1, qty: -1, _id: 1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            name: { $ifNull: ['$name', { $toString: '$_id' }] },
            revenue: 1,
            qty: 1
          }
        }
      ]);

      res.json({ from, to, items: rows, limit });
    } catch (err) {
      next(err);
    }
  },

  async topCustomers(req, res, next) {
    try {
      ensureAdmin(req);
      const { from, to } = parseRange(req.query);
      const limit = Number(req.query.limit || 10);

      const rows = await Order.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: '$userEmail',
            revenue: { $sum: '$subtotal' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1, orders: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            userEmail: '$_id',
            revenue: 1,
            orders: 1
          }
        }
      ]);

      res.json({ from, to, items: rows, limit });
    } catch (err) {
      next(err);
    }
  }
};
