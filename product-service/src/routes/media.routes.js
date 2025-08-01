import { Router } from 'express';
import { MediaController } from '../controllers/media.controller.js';
import { validateImageSearch } from '../validations/media.validation.js';

const router = Router({ mergeParams: true });

// GET /products/images/search?query=…&per_page=…&page=…
router.get('/search', validateImageSearch, MediaController.searchImages);

// Proxy upload to Cloudinary
router.post('/upload', MediaController.proxyUploadToCloudinary);

export default router;
