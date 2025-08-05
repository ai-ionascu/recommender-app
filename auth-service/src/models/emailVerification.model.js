import pool from '../config/db.js';

export async function createVerificationToken(userId, token, expiresAt, client = pool) {
  const query = `
    INSERT INTO email_verification_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const values = [userId, token, expiresAt];
  const result = await client.query(query, values);
  return result.rows[0];
}

export async function findByToken(token) {
  const result = await pool.query(
    'SELECT * FROM email_verification_tokens WHERE token = $1',
    [token]
  );
  return result.rows[0];
}

export async function deleteToken(token) {
  await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);
}
