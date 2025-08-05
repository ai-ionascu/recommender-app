import pool from '../../config/db.js';
import { hashPassword } from '../../utils/hash.js';

export async function seedUsers() {
  const client = await pool.connect();
  try {
    console.log('[auth-seed] Seeding users...');
    await client.query('BEGIN');

    const passwordAdmin = await hashPassword('admin123');
    const passwordUser = await hashPassword('user123');

    await client.query(`
      INSERT INTO users (email, password_hash, is_verified)
      VALUES 
        ('admin@example.com', $1, true),
        ('user@example.com', $2, false)
      ON CONFLICT (email) DO NOTHING;
    `, [passwordAdmin, passwordUser]);

    await client.query('COMMIT');
    console.log('[auth-seed] Users seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[auth-seed] Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
    console.log('[auth-seed] Connection released');
  }
}
