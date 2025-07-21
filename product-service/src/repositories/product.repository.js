import { pool } from '../../src/config/db.js';

export async function findAll(filter = {}) {
  const params = [];
  let sql = 'SELECT * FROM products';
  if (filter.category) {
    params.push(filter.category);
    sql += ` WHERE category = $${params.length}`;
  }
  if (filter.featured !== undefined) {
    params.push(filter.featured);
    sql += params.length === 1 ? ` WHERE` : ` AND`;
    sql += ` featured = $${params.length}`;
  }
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] || null;
}
