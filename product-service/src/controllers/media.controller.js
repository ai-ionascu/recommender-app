// src/controllers/media.controller.js
import { MediaService } from '../services/media.service.js';
import catchAsync from '../utils/catchAsync.js';

export const MediaController = {
  searchImages: catchAsync(async (req, res) => {
    const { query, per_page, page } = req.query;
    const perPage = Number(per_page) || 30;
    const pageNum = Number(page) || 1;

    const images = await MediaService.searchImages(query, perPage, pageNum);
    res.json(images);
  }),
};
