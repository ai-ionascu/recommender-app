import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const {
  PG_USER,
  PG_PASSWORD,
  PG_HOST,
  PG_PORT,
  USERS_DB,
  NODE_ENV,
} = process.env;

const host = PG_HOST === 'localhost' && NODE_ENV === 'production'
  ? 'postgres'
  : PG_HOST;

const pool = new Pool({
  user: PG_USER,
  password: PG_PASSWORD,
  host,
  port: PG_PORT,
  database: USERS_DB,
});

pool.on('connect', () => {
  console.log(`[DB] Connected to ${USERS_DB} at ${host}:${PG_PORT}`);
});

export default pool;
