import catchAsync from '../utils/catchAsync.js';
import { ImageService } from '../services/image.service.js';

export const ImageController = {
  list: catchAsync(async (req, res) => {
    const imgs = await ImageService.list(req.params.id);
    res.json(imgs);
  }),

  add: catchAsync(async (req, res) => {
    const images = req.body.images || [];
    const result = await ImageService.add(req.params.id, images);
    res.status(201).json(result);
  }),

  setMain: catchAsync(async (req, res) => {
    const img = await ImageService.setMain(req.params.id, req.params.imageId);
    res.json({ message: 'Main image set', image: img });
  }),

  remove: catchAsync(async (req, res) => {
    const remaining = await ImageService.remove(req.params.id, req.params.imageId);
    res.json(remaining);
  })
};