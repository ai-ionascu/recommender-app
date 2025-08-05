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
