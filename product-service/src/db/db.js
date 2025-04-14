import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbHost = process.env.NODE_ENV === 'production' 
  ? process.env.PG_HOST : 'localhost';
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '../../../.env');
  dotenv.config({ path: envPath });
}

export const pool = new Pool({
  host: dbHost,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
  port: process.env.PG_PORT,
});

// helper simple queries
export async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}