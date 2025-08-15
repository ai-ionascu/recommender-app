import { pool } from '../../config/db.js';

export async function runProcessedEventsMigration() {
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_events (
      id SERIAL PRIMARY KEY,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    DROP INDEX IF EXISTS public.ux_processed_events_event_id;`
  );
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_processed_events_event_id
      ON processed_events(event_id, event_type);
  `);
}