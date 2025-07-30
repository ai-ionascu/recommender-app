import catchAsync from '../utils/catchAsync.js';
import { FeatureService } from '../services/feature.service.js';

export const FeatureController = {
  list: catchAsync(async (req, res) => {
    const feats = await FeatureService.list(req.params.id);
    res.json(feats);
  }),

  add: catchAsync(async (req, res) => {
    const { label, value } = req.body;
    const feat = await FeatureService.add(req.params.id, label, value);
    res.status(201).json(feat);
  }),

  update: catchAsync(async (req, res) => {
    const { label, value } = req.body;
    const updated = await FeatureService.update(
      req.params.id,
      req.params.featureId,
      { label, value }
    );
    res.json(updated);
  }),

  remove: catchAsync(async (req, res) => {
    await FeatureService.remove(req.params.id, req.params.featureId);
    res.status(204).end();
  })
};