import { Router } from 'express';
import { MediaController } from '../controllers/media.controller.js';
import { validateImageSearch } from '../validations/media.validation.js';

const router = Router();

// GET /products/images/search?query=…&per_page=…&page=…
router.get(
  '/search',
  validateImageSearch,
  MediaController.searchImages
);

export default router;
