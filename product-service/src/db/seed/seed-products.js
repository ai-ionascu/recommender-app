import { pool } from '../../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedProducts() {
  const client = await pool.connect();

  try {
    console.log('Seeding products...');
    await client.query('BEGIN');

    // check if already populated
    const { rows } = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(rows[0].count) > 0) {
      console.log('Products already seeded, skipping.');
      await client.query('ROLLBACK');
      return;
    }

    const seedPath = path.join(__dirname, 'seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length);

    for (const cmd of commands) {
      await client.query(cmd);
    }

    await client.query('COMMIT');
    console.log('Seeding completed!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}
