import AppError from '../errors/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { ReviewRepository } from '../repositories/review.repository.js';

export const ReviewService = {
  async list(productId) {
    return await ReviewRepository.getReviews(productId);
  },

  async add(client, productId, data) {
    return await ReviewRepository.createReview(client, productId, data);
  },

  async update(client, productId, reviewId, data) {
    const rev = await ReviewRepository.updateReview(client, productId, reviewId, data);
    if (!rev) {
      throw new AppError('Review not found', 404);
    }
    return rev;
  },

  async remove(client, productId, reviewId) {
    await ReviewRepository.deleteReview(client, productId, reviewId);
  }
};
