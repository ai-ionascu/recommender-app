import db from '../config/db.js';

export async function createPasswordResetToken(userId, token, expiresAt) {
  const result = await db.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3) RETURNING *`,
    [userId, token, expiresAt]
  );
  return result.rows[0];
}

export async function findResetToken(token) {
  const result = await db.query(
    `SELECT * FROM password_reset_tokens WHERE token = $1`,
    [token]
  );
  return result.rows[0];
}

export async function deleteResetToken(token) {
  await db.query(`DELETE FROM password_reset_tokens WHERE token = $1`, [token]);
}
