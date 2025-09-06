import { runMigration } from './db/migrations/001-initial-schema.js';
import { seedUsers } from './db/seed/seed-users.js';
import express from 'express';
import authRouter from './routes/auth.routes.js';
import { startCleanupJob } from './jobs/cleanupUnverified.js';
import { startTokenCleanupJob } from './jobs/cleanupTokens.job.js';

const app = express();
app.use(express.json());

// if (process.env.NODE_ENV === 'development') {
  await runMigration();
  await seedUsers();
// }

app.use('/auth', authRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'auth-service' });
});

startCleanupJob();
startTokenCleanupJob();

// Global error handler (last)
app.use((err, req, res, _next) => {
  console.error('[auth-service] Unhandled error:', err?.message || err);
  const status = Number.isInteger(err?.status) ? err.status : 500;
  if (!res.headersSent) {
    res.status(status).json({ message: err?.message || 'Internal server error.' });
  }
});

export default app;
