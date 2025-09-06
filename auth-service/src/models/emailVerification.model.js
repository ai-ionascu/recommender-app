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
    'SELECT * FROM email_verification_tokens WHERE token = $1 LIMIT 1',
    [token]
  );
  return result.rows[0];
}

export async function findByHashedToken(tokenHash) {
  const { rows } = await pool.query(
    "SELECT * FROM email_verification_tokens WHERE token_hash = $1 LIMIT 1",
    [tokenHash]
  );
  return rows[0] || null;
}

export async function deleteToken(token) {
  await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);
}

export async function findActiveToken(userId) {
  const { rows } = await pool.query(
    `SELECT token, expires_at
       FROM email_verification_tokens
      WHERE user_id = $1::uuid
        AND expires_at > NOW()
      ORDER BY expires_at DESC
      LIMIT 1`,
    [String(userId)]
  );
  return rows[0] || null;
}

