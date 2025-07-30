import catchAsync from '../utils/catchAsync.js';
import { ReviewService } from '../services/review.service.js';

export const ReviewController = {
  list: catchAsync(async (req, res) => {
    const revs = await ReviewService.list(req.params.id);
    res.json(revs);
  }),

  add: catchAsync(async (req, res) => {
    const rev = await ReviewService.add(req.params.id, req.body);
    res.status(201).json(rev);
  }),

  update: catchAsync(async (req, res) => {
    const rev = await ReviewService.update(
      req.params.id,
      req.params.reviewId,
      req.body
    );
    res.json(rev);
  }),

  remove: catchAsync(async (req, res) => {
    await ReviewService.remove(req.params.id, req.params.reviewId);
    res.status(204).end();
  })
};