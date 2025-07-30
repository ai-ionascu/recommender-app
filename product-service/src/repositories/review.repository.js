import { pool } from '../config/db.js';

export const ReviewRepository = {
  // list approved reviews for a product
  async getReviews(productId) {
    const { rows } = await pool.query(
      `SELECT id, user_id, rating, comment, approved, created_at
         FROM product_reviews
        WHERE product_id = $1 AND approved = true
        ORDER BY created_at DESC`,
      [productId]
    );
    return rows;
  },

  // create a new review (inside a transaction)
  async createReview(client, productId, data) {
    const { user_id, rating, comment = null, approved = false } = data;
    const { rows } = await client.query(
      `INSERT INTO product_reviews
         (product_id, user_id, rating, comment, approved)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [productId, user_id, rating, comment, approved]
    );
    return rows[0];
  },

  // update an existing review
  async updateReview(client, productId, reviewId, data) {
    const sets = [];
    const vals = [];
    let idx = 1;

    if (data.rating != null) {
      sets.push(`rating = $${idx}`); vals.push(data.rating); idx++;
    }
    if (data.comment != null) {
      sets.push(`comment = $${idx}`); vals.push(data.comment); idx++;
    }
    if (data.approved != null) {
      sets.push(`approved = $${idx}`); vals.push(data.approved); idx++;
    }

    if (sets.length === 0) {
      return null;
    }

    // bind productId & reviewId
    vals.push(productId, reviewId);
    const { rows } = await (client || pool).query(
      `UPDATE product_reviews
          SET ${sets.join(', ')}
        WHERE product_id = $${idx++} AND id = $${idx}
        RETURNING *`,
      vals
    );
    return rows[0];
  },

  // delete one review
  async deleteReview(client, productId, reviewId) {
    await client.query(
      `DELETE FROM product_reviews
        WHERE product_id = $1 AND id = $2`,
      [productId, reviewId]
    );
  }
};
