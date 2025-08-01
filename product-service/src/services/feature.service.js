import AppError from '../errors/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { FeatureRepository } from '../repositories/feature.repository.js';

export const FeatureService = {
  async list(productId) {
    return await FeatureRepository.getFeatures(productId);
  },

  async add(client, productId, label, value) {
    if (!label || typeof label !== 'string') {
      throw new AppError('`label` is required and must be a non-empty string', 400);
    }
    if (value == null || typeof value !== 'string') {
      throw new AppError('`value` is required and must be a string', 400);
    }
    await FeatureRepository.insert(client, productId, label, value);
    return await FeatureRepository.getFeatures(productId);
  },

  async update(client, productId, featureId, data) {
    const feat = await FeatureRepository.update(client, productId, featureId, data);
    if (!feat) {
      throw new AppError('Feature not found', 404);
    }
    return feat;
  },

  async remove(client, productId, featureId) {
    await FeatureRepository.remove(client, productId, featureId);
  }
};
