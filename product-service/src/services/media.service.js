// src/services/media.service.js
import axios from 'axios';
import AppError from '../errors/AppError.js';
import { config } from '../config/env.js';

const UNSPLASH_ACCESS_KEY = config.external.unsplashKey;
const PEXELS_API_KEY = config.external.pexelsKey;

export const MediaService = {
  async searchImages(query, perPage = 30, page = 1) {
    if (!query) throw new AppError('Query is required', 400);

    // Unsplash
    try {
      const u = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query, per_page: perPage, page },
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
      });

      if (u.data?.results?.length) {
        return u.data.results.map(img => ({
          url: img.urls.regular,
          alt_text: img.alt_description || 'Image'
        }));
      }
    } catch (e) {
      // log, continue with fallback
      console.error('Unsplash error:', e.message);
    }

    // Pexels fallback
    try {
      const p = await axios.get('https://api.pexels.com/v1/search', {
        params: { query, per_page: perPage, page },
        headers: { Authorization: PEXELS_API_KEY }
      });

      if (p.data?.photos?.length) {
        return p.data.photos.map(img => ({
          url: img.src.large,
          alt_text: img.alt || 'Image'
        }));
      }
    } catch (e) {
      console.error('Pexels error:', e.message);
    }

    throw new AppError('No images found', 404);
  }
};
