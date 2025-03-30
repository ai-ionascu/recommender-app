import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.postgres,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

// Verifică conexiunea la PostgreSQL
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('Eroare conexiune: ', err);
  else console.log('Conectat la PostgreSQL');
});