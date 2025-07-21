// Transitional re-export pentru vechile importuri:
export { pool } from '../config/db.js';

export async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
