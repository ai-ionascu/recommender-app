import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller.js';
import { validateReview }  from '../validations/review.validation.js';

const router = Router({ mergeParams: true });

// List / add / update / delete reviews
router.get('/', ReviewController.list);
router.post('/', validateReview, ReviewController.add);
router.put('/:reviewId', validateReview, ReviewController.update);
router.delete('/:reviewId', ReviewController.remove);

export default router;
