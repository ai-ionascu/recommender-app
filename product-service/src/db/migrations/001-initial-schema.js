import { pool } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Applying migration...');
    await client.query('BEGIN');

    const schemaPath = path.join(
      __dirname, 
      'schemas', 
      '001-initial-schema.sql'
    );
    const sql = fs.readFileSync(schemaPath, 'utf8');

    const commands = sql.split(';').filter(cmd => cmd.trim());
    for (const cmd of commands) {
      await client.query(cmd);
    }

    await client.query('COMMIT');
    console.log('Migration successful!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error.message);
    throw error;

  } finally {
    client.release();
    console.log('Connection released');
  }
}