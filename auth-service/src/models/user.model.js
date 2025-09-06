import pool from '../config/db.js';

export const createUser = async ({ email, passwordHash, role = 'user' }, client = pool) => {
  const query = `
    INSERT INTO users (email, password_hash, role, is_verified)
    VALUES ($1, $2, $3, false)
    RETURNING id, email, role, created_at, is_verified
  `;
  const values = [email, passwordHash, role];
  const result = await client.query(query, values);
  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const query = `SELECT * FROM users WHERE email = $1`;
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

export const findUserById = async (id) => {
  const query = `SELECT * FROM users WHERE id = $1::uuid`;
  const result = await pool.query(query, [String(id)]);
  return result.rows[0] || null;
};

export async function markUserAsVerified(userId) {
  const sql = `
    UPDATE users
       SET is_verified = true,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = $1::uuid
     RETURNING id, is_verified
  `;
  const { rows } = await pool.query(sql, [String(userId)]);
  if (rows.length !== 1) {
    throw new Error('User not found while verifying email');
  }
  return rows[0];
}

export const deleteUnverifiedUsersOlderThan = async (minutes = 60) => {
  const query = `
    DELETE FROM users
    WHERE is_verified = false
      AND created_at < NOW() - INTERVAL '${minutes} minutes'
  `;
  await pool.query(query);
};

export const listUsers = async () => {
  const query = `SELECT id, email, role, is_verified, created_at FROM users ORDER BY created_at DESC`;
  const result = await pool.query(query);
  return result.rows;
};

export async function updateUserRole(userId, patch = {}) {
  const sets = [];
  const vals = [];
  let idx = 1;
  if (patch.role != null) { sets.push(`role = $${idx++}`); vals.push(patch.role); }
  if (patch.is_verified != null) { sets.push(`is_verified = $${idx++}`); vals.push(patch.is_verified); }
  if (sets.length === 0) return null;
  vals.push(String(userId));
  const q = `UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}::uuid RETURNING id, email, role, is_verified, created_at`;
  const { rows } = await pool.query(q, vals);
  return rows[0] || null;
}

export async function deleteUserById(userId) {
  await pool.query(`DELETE FROM users WHERE id = $1::uuid`, [String(userId)]);
  return true;
}
