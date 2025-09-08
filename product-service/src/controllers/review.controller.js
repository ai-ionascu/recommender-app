import catchAsync from '../utils/catchAsync.js';
import { ReviewService } from '../services/review.service.js';
import { withTransaction } from '../utils/transaction.js';

export const ReviewController = {
  list: catchAsync(async (req, res) => {
    const revs = await ReviewService.list(req.params.id);
    res.json(revs);
  }),

  add: catchAsync(async (req, res) => {
    const payload = {
      user_id: String(req.body.user_id),
      rating: Number(req.body.rating),
      comment: req.body?.comment ?? null,
      // server decides visibility; set to true for instant display
      approved: true,
    };
    const rev = await withTransaction((client) =>
      ReviewService.add(client, req.params.id, payload)
    );
    res.status(201).json(rev);
  }),

  update: catchAsync(async (req, res) => {
    const rev = await withTransaction((client) =>
      ReviewService.update(client, req.params.id, req.params.reviewId, req.body)
    );
    res.json(rev);
  }),

  remove: catchAsync(async (req, res) => {
    await withTransaction((client) =>
      ReviewService.remove(client, req.params.id, req.params.reviewId)
    );
    res.status(204).end();
  })
};