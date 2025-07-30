import { pool } from '../config/db.js';

export const ImageRepository = {
  async addImages(clientOrPool, productId, images) {
    const executor = clientOrPool.query ? clientOrPool : pool; // acceptă client de tranzacție sau pool
    for (const img of images) {
      await executor.query(
        `INSERT INTO product_images (product_id, url, alt_text, is_main)
         VALUES ($1,$2,$3,$4)`,
        [productId, img.url, img.alt_text || '', !!img.is_main]
      );
    }
  },

  async getImages(productId) {
    const { rows } = await pool.query(
      'SELECT id, url, alt_text, is_main FROM product_images WHERE product_id = $1 ORDER BY is_main DESC, id ASC',
      [productId]
    );
    return rows;
  },

  async setMain(clientOrPool, productId, imageId) {
    const executor = clientOrPool.query ? clientOrPool : pool;
    await executor.query('UPDATE product_images SET is_main = false WHERE product_id = $1', [productId]);
    const { rows } = await executor.query(
      'UPDATE product_images SET is_main = true WHERE product_id = $1 AND id = $2 RETURNING *',
      [productId, imageId]
    );
    return rows[0];
  },

  async deleteImage(clientOrPool, productId, imageId) {
    const executor = clientOrPool.query ? clientOrPool : pool;
    await executor.query('DELETE FROM product_images WHERE product_id = $1 AND id = $2', [productId, imageId]);
  }
};
