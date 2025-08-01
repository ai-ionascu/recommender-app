import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL + '/products';

export const getProducts = () => axios.get(BASE_URL);

export const getProductById = (id) => axios.get(`${BASE_URL}/${id}`);

export const createProduct = (data) =>
  axios.post(BASE_URL, data, {
    headers: { 'Content-Type': 'application/json' }
  });

export const updateProduct = (id, data) =>
  axios.put(`${BASE_URL}/${id}`, data, {
    headers: { 'Content-Type': 'application/json' }
  });

export const deleteProduct = (id) => axios.delete(`${BASE_URL}/${id}`);
