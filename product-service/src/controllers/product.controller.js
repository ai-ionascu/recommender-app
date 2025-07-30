import { ProductService } from '../services/product.service.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../errors/AppError.js';
import { MediaService } from '../services/media.service.js';

export const ProductController = {
  create: catchAsync(async (req, res) => {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json(product);
  }),

  list: catchAsync(async (req, res) => {
    const filters = { category: req.query.category, featured: req.query.featured };
    const products = await ProductService.getProducts(filters);
    res.json(products);
  }),

  getOne: catchAsync(async (req, res) => {
    const product = await ProductService.getProduct(req.params.productId);
    res.json(product);
  }),

  update: catchAsync(async (req, res) => {
    const updated = await ProductService.updateProduct(req.params.productId, req.body);
    res.json(updated);
  }),

  delete: catchAsync(async (req, res) => {
    await ProductService.deleteProduct(req.params.productId);
    res.status(204).end();
  }),

  // image search (proxy Unsplash/Pexels)
  searchImages: catchAsync(async (req, res) => {
    const { query, per_page, page } = req.query;
    if (!query || typeof query !== 'string') {
      throw new AppError('Missing or invalid "query" parameter', 400);
    }
    const perPage = Number(per_page) || 30;
    const pageNum = Number(page) || 1;

    const imgs = await MediaService.searchImages(query, perPage, pageNum);
    res.json(imgs);
  })
};