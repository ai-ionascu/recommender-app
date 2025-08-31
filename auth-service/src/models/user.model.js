import db from '../config/db.js';

export const createUser = async ({ email, passwordHash, role = 'user' }, client = db) => {
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
  const result = await db.query(query, [email]);
  return result.rows[0] || null;
};

export const findUserById = async (id) => {
  const query = `SELECT * FROM users WHERE id = $1`;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
};

export const markUserAsVerified = async (userId) => {
  const query = `
    UPDATE users
    SET is_verified = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `;
  await db.query(query, [userId]);
};

export const deleteUnverifiedUsersOlderThan = async (minutes = 60) => {
  const query = `
    DELETE FROM users
    WHERE is_verified = false
      AND created_at < NOW() - INTERVAL '${minutes} minutes'
  `;
  await db.query(query);
};

// list all users (for admin)
export const listUsers = async () => {
  const query = `SELECT id, email, role, is_verified, created_at FROM users ORDER BY created_at DESC`;
  const result = await db.query(query);
  return result.rows;
};

export async function updateUserRole(userId, patch = {}) {
  const sets = [];
  const vals = [];
  let idx = 1;
  if (patch.role != null) { sets.push(`role = $${idx++}`); vals.push(patch.role); }
  if (patch.is_verified != null) { sets.push(`is_verified = $${idx++}`); vals.push(patch.is_verified); }
  if (sets.length === 0) return null;
  vals.push(userId);
  const q = `UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, email, role, is_verified, created_at`;
  const { rows } = await db.query(q, vals);
  return rows[0] || null;
}

export async function deleteUserById(userId) {
  await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
  return true;
}
