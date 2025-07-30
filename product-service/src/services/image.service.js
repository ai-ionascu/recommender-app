import AppError from '../errors/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { ImageRepository } from '../repositories/image.repository.js';

export const ImageService = {

  async list(productId) {
    return await ImageRepository.getImages(productId);
  },

  async add(productId, images) {
    if (!Array.isArray(images)) {
      throw new AppError('Images must be an array', 400);
    }
    if (images.length > 3) {
      throw new AppError('You can associate at most 3 images per product.', 400);
    }
    const mainCount = images.filter(i => i.is_main).length;
    if (images.length > 0 && mainCount !== 1) {
      throw new AppError('Exactly one image must be marked as main.', 400);
    }

    return withTransaction(async (client) => {
      await ImageRepository.addImages(client, productId, images);
      return await ImageRepository.getImages(productId);
    });
  },

  async setMain(productId, imageId) {
    return withTransaction(async (client) => {
      // reset previous main flags
      await ImageRepository.clearMain(client, productId);
      // set new main
      const img = await ImageRepository.setMain(client, productId, imageId);
      if (!img) {
        throw new AppError('Image not found', 404);
      }
      return img;
    });
  },

  async remove(productId, imageId) {
    return withTransaction(async (client) => {
      await ImageRepository.deleteImage(client, productId, imageId);
      const remaining = await ImageRepository.getImages(productId);
      // if no main exists, set first one
      if (remaining.length > 0 && !remaining.some(i => i.is_main)) {
        await ImageRepository.setMain(client, productId, remaining[0].id);
      }
      return remaining;
    });
  }
};
