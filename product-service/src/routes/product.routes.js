import { Router } from 'express';
import { list, getOne } from '../controllers/product.controller.js';

const router = Router();
router.get('/', list);
router.get('/:id', getOne);
// (ulterior: post, put, delete)
export default router;
