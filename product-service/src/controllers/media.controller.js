// src/controllers/media.controller.js
import { MediaService } from '../services/media.service.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../errors/AppError.js';

export const MediaController = {
  searchImages: catchAsync(async (req, res) => {
    const { query, per_page, page } = req.query;
    const perPage = Number(per_page) || 30;
    const pageNum = Number(page) || 1;

    const images = await MediaService.searchImages(query, perPage, pageNum);
    res.json(images);
  }),

    // proxy upload to Cloudinary
  proxyUploadToCloudinary: catchAsync(async (req, res) => {
    const { url } = req.body;
    if (!url) {
      throw new AppError('Missing image URL', 400);
    }
    const secure_url = await MediaService.uploadImageFromUrl(url);
    res.json({ secure_url });
  })
};
