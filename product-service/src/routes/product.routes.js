import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { validateProduct } from '../validations/product.validation.js';

const router = Router();

// Search images route proxy Unsplash/Pexels
router.get('/images/search', ProductController.searchImages);

// CRUD routes for products
router.get('/', ProductController.list);
router.get('/:productId', ProductController.getOne);
router.post('/', validateProduct, ProductController.create);
router.put('/:productId', validateProduct, ProductController.update);
router.delete('/:productId', ProductController.delete);

export default router;