import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { validateProduct, validateProductUpdate } from '../validations/product.validation.js';

const router = Router();

// CRUD routes for products
router.get('/', ProductController.list);
router.get('/:productId', ProductController.getOne);
router.post('/', validateProduct, ProductController.create);
router.put('/:productId', validateProductUpdate, ProductController.update);
router.patch('/:productId', validateProductUpdate, ProductController.update);
router.delete('/:productId', ProductController.delete);

export default router;