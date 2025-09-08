import { Order } from '../models/order.mongo.js';
import { AppError } from '../utils/errors.js';

function toNumber(n) {
  const v = Number(n);
  return Number.isNaN(v) ? null : v;
}

/**
 * Co-purchase (Frequently Bought Together) computed on-the-fly.
 * - Orders with status:'paid' that contain anchor productId
 * - Count co-occurring productIds (excluding the anchor)
 * - score = sum(qty), tie-breaker coCount
 */
export const RecommendationService = {
  async getCoPurchase(productId, { limit = 8 } = {}) {
    const pid = toNumber(productId);
    if (pid == null) throw new AppError('Invalid productId', 400);

    const pipeline = [
      { $match: { status: 'paid', 'items.productId': pid } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $ne: pid } } },
      {
        $group: {
          _id: '$items.productId',
          score: { $sum: '$items.qty' },
          coCount: { $sum: 1 }
        }
      },
      { $sort: { score: -1, coCount: -1, _id: 1 } },
      { $limit: Number(limit) > 0 ? Number(limit) : 8 },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          score: 1,
          coCount: 1
        }
      }
    ];

    return Order.aggregate(pipeline);
  }
};
