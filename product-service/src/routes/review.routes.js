import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller.js';
import { validateReviewCreate, validateReviewUpdate } from '../validations/review.validation.js';
import { ensureBuyerOfProduct } from '../utils/ensureBuyerOfProduct.js';

const router = Router({ mergeParams: true });

// List / add / update / delete reviews
router.get('/', ReviewController.list);
router.post('/', ensureBuyerOfProduct, validateReviewCreate, ReviewController.add);
router.put('/:reviewId', ensureBuyerOfProduct, validateReviewUpdate, ReviewController.update);
router.delete('/:reviewId', ensureBuyerOfProduct, ReviewController.remove);

export default router;
