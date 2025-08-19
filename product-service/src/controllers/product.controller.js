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
    const id = Number(req.params.productId);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid product id' });
    const product = await ProductService.getProduct(id);
    res.json(product);
  }),

  update: catchAsync(async (req, res) => {
    const id = Number(req.params.productId);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid product id' });
    const updated = await ProductService.updateProduct(id, req.body);
    res.json(updated);
  }),

  delete: catchAsync(async (req, res) => {
    const id = Number(req.params.productId);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid product id' });
    await ProductService.deleteProduct(id);
    res.status(204).end();
  })
};