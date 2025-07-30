import { pool } from '../config/db.js';

// insert multiple features for a product
export const FeatureRepository = {
  async createFeatures(client, productId, features) {
    for (const f of features) {
      await client.query(
        `INSERT INTO product_features (product_id, label, value)
         VALUES ($1,$2,$3)`,
        [productId, f.label, f.value]
      );
    }
  },

  // get all features for a product
  async getFeatures(productId) {
    const { rows } = await pool.query(
      'SELECT id, label, value FROM product_features WHERE product_id = $1',
      [productId]
    );
    return rows;
  },

  // insert a single feature
  async insert(client, productId, label, value) {
    const { rows } = await client.query(
      `INSERT INTO product_features (product_id, label, value)
       VALUES ($1, $2, $3)
       RETURNING id, label, value`,
      [productId, label, value]
    );
    return rows[0];
  },

  // update one feature by its id
  async update(client, featureId, label, value) {
    const { rows } = await client.query(
      `UPDATE product_features
         SET label = $1, value = $2
       WHERE id = $3
       RETURNING id, label, value`,
      [label, value, featureId]
    );
    return rows[0];
  },

  // delete one feature by its id
  async remove(client, productId, featureId) {
    await client.query(
      `DELETE FROM product_features
       WHERE id = $1 AND product_id = $2`,
      [featureId, productId]
    );
  },

  // find a specific feature (helper)
  async findOne(client, featureId, productId) {
    const { rows } = await client.query(
      `SELECT id FROM product_features
       WHERE id = $1 AND product_id = $2`,
      [featureId, productId]
    );
    return rows[0];
  }
};

