import pool from '../config/db.js';

export async function createEmailChangeToken(userId, newEmail, token, expiresAt) {
    const result = await pool.query(
        `INSERT INTO email_change_tokens (user_id, new_email, token, expires_at)
        VALUES ($1, $2, $3, $4)`,
        [userId, newEmail, token, expiresAt]
    );
    return result.rows[0];
}

export async function findEmailChangeToken(token) {
  const res = await pool.query(
    `SELECT * FROM email_change_tokens WHERE token = $1`,
    [token]
  );
  return res.rows[0];
}

export async function deleteEmailChangeToken(token) {
  await pool.query(`DELETE FROM email_change_tokens WHERE token = $1`, [token]);
}
