import AppError from '../errors/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { ImageRepository } from '../repositories/image.repository.js';

export const ImageService = {

  async list(productId, client = null) {
    return await ImageRepository.getImages(productId);
  },

  async add(productId, images, client = null) {
    if (!Array.isArray(images)) {
        throw new AppError('Images must be an array', 400);
    }

    if (images.length === 1 && images[0].is_main !== true) {
        images[0].is_main = true;
    }

    if (images.length > 3) {
        throw new AppError('You can associate at most 3 images per product.', 400);
    }

    const mainCount = images.filter(i => i.is_main).length;
    if (images.length > 0 && mainCount !== 1) {
        throw new AppError('Exactly one image must be marked as main.', 400);
    }

    const runner = async (trxClient) => {
      await ImageRepository.addImages(trxClient, productId, images);
      return await ImageRepository.getImages(productId, trxClient);
    };

    return client ? runner(client) : withTransaction(runner);
  },

  async setMain(productId, imageId, client = null) {
    const runner = async (trxClient) => {
      await ImageRepository.clearMain(trxClient, productId);
      const img = await ImageRepository.setMain(trxClient, productId, imageId);
      if (!img) throw new AppError('Image not found', 404);
      return img;
    };

    return client ? runner(client) : withTransaction(runner);
  },

  async remove(productId, imageId, client = null) {
    const runner = async (trxClient) => {
      const wasMain = await ImageRepository.getImageById(productId, imageId, trxClient).then(img => img?.is_main);

      await ImageRepository.deleteImage(trxClient, productId, imageId);
      let remaining = await ImageRepository.getImages(productId, trxClient);

      let autoMainSet = false;
      if (wasMain && remaining.length > 0 && !remaining.some(i => i.is_main)) {
        await ImageService.setMain(productId, remaining[0].id, trxClient);
        remaining = await ImageRepository.getImages(productId, trxClient);
        autoMainSet = true;
      }

      return { images: remaining, mainImageAutoSet: autoMainSet };
    };

    return client ? runner(client) : withTransaction(runner);
  },

  async update(client, productId, existingImages, newImages) {
    if (!Array.isArray(newImages)) {
        throw new AppError('Images must be an array', 400);
    }

    const existingMap = new Map(existingImages.map(img => [img.id, img]));
    const incomingMap = new Map(
        newImages.filter(img => img.id).map(img => [img.id, img])
    );

    const toDelete = existingImages
        .filter(img => !incomingMap.has(img.id))
        .map(img => img.id);

    const toAdd = newImages.filter(img => !img.id);

    // fallback pentru `is_main`
    let mainCount = newImages.filter(img => img.is_main === true).length;
    let autoMainSet = false;

    if (newImages.length === 1 && mainCount === 0) {
        newImages[0].is_main = true;
        mainCount = 1;
        autoMainSet = true;
    }

    if (newImages.length > 0 && mainCount !== 1) {
        // corectăm automat dacă e invalid
        newImages.forEach(img => img.is_main = false);
        newImages[0].is_main = true;
        autoMainSet = true;
    }

    // Apply DB changes
    for (const imageId of toDelete) {
        await ImageRepository.deleteImage(client, productId, imageId);
    }

    if (toAdd.length > 0) {
        await ImageRepository.addImages(client, productId, toAdd);
    }

    const mainImage = newImages.find(img => img.is_main);
    if (mainImage?.id) {
        await ImageRepository.clearMain(client, productId);
        await ImageRepository.setMain(client, productId, mainImage.id);
    } else {
        // dacă e nou adăugată și nu are id
        const updatedImages = await ImageRepository.getImages(productId);
        const autoMain = updatedImages.find(img => img.is_main);
        if (!autoMain && updatedImages.length > 0) {
        await ImageRepository.clearMain(client, productId);
        await ImageRepository.setMain(client, productId, updatedImages[0].id);
        autoMainSet = true;
        }
    }

    const finalImages = await ImageService.list(productId);
    return {
        images: finalImages,
        mainImageAutoSet: autoMainSet
    };
  }
};
