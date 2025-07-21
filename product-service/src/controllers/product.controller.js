import * as productService from '../services/product.service.js';

export async function list(req, res, next) {
  try {
    const products = await productService.listProducts({
      category: req.query.category,
      featured: req.query.featured === 'true' ? true :
                req.query.featured === 'false' ? false : undefined
    });
    res.json(products);
  } catch (e) {
    next(e);
  }
}

export async function getOne(req, res, next) {
  try {
    const product = await productService.getProduct(req.params.id);
    res.json(product);
  } catch (e) {
    next(e);
  }
}
