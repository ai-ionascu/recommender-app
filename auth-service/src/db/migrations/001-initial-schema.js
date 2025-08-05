import pool from '../../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('[auth-migration] Applying migration...');
    await client.query('BEGIN');

    const schemaPath = path.join(__dirname, '001-initial-schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    const commands = sql.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length);
    for (const cmd of commands) {
      await client.query(cmd);
    }

    await client.query('COMMIT');
    console.log('[auth-migration] Migration successful!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[auth-migration] Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    console.log('[auth-migration] Connection released');
  }
}
