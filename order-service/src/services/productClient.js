import axios from 'axios';
import { configServices } from '../config/services.js';

const http = axios.create({
  baseURL: configServices.productServiceUrl,
  timeout: 5000,
});

export async function fetchProduct(productId, bearerToken = null) {
  const headers = {};
  if (bearerToken) headers['Authorization'] = bearerToken;

  const { data } = await http.get(`/products/${productId}`, { headers });
  return data; // expected: { id, price, stock, ... }
}
