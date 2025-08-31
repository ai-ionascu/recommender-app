import { useEffect, useState } from 'react';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../api/products.js';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // getProducts returns { items, total } or { items: [...] }
      const res = await getProducts();
      const items = Array.isArray(res) ? res : (res?.items ?? []);
      setProducts(items);
    } catch (err) {
      setError('Failed to fetch products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (data) => {
    try {
      const res = await createProduct(data);
      await fetchProducts();
      return res;
    } catch (err) {
      throw err;
    }
  };

  const editProduct = async (id, data) => {
    try {
      const res = await updateProduct(id, data);
      await fetchProducts();
      return res;
    } catch (err) {
      throw err;
    }
  };

  const removeProduct = async (id) => {
    try {
      await deleteProduct(id);
      setProducts(products => products.filter(p => p.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const loadProduct = async (id) => {
    try {
      const res = await getProductById(id);
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    editProduct,
    removeProduct,
    loadProduct
  };
};
