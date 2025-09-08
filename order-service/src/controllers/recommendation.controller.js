import { RecommendationService } from '../services/recommendation.service.js';

export const RecommendationController = {
  // GET /internal/copurchase/:productId?limit=8
  async coPurchase(req, res, next) {
    try {
      const { productId } = req.params;
      const { limit } = req.query;
      const items = await RecommendationService.getCoPurchase(productId, { limit });
      res.json({ items, total: items.length });
    } catch (err) {
      next(err);
    }
  }
};
