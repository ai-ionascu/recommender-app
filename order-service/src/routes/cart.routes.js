import { Router } from 'express';
import { CartController } from '../controllers/cart.controller.js';

const router = Router();

router.get('/', CartController.getCart);
router.post('/items', CartController.addItem);
router.put('/items/:id', CartController.updateItem);
router.delete('/items/:id', CartController.removeItem);
router.delete('/', CartController.clear);

export default router;
