// src/services/review.service.js

import AppError            from '../errors/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { ReviewRepository } from '../repositories/review.repository.js';

export const ReviewService = {

  async list(productId) {
    return await ReviewRepository.getReviews(productId);
  },

  async add(productId, data) {
    return withTransaction(async (client) => {
      return await ReviewRepository.createReview(client, productId, data);
    });
  },

  async update(productId, reviewId, data) {
    const rev = await ReviewRepository.updateReview(
      null,
      productId,
      reviewId,
      data
    );
    if (!rev) {
      throw new AppError('Review not found', 404);
    }
    return rev;
  },

  async remove(productId, reviewId) {
    return withTransaction(async (client) => {
      await ReviewRepository.deleteReview(client, productId, reviewId);
    });
  }
};
