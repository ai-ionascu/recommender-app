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

export default app;
