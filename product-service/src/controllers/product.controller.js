import { ProductService } from '../services/product.service.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../errors/AppError.js';


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
  })
};