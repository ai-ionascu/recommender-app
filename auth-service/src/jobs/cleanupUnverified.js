import cron from 'node-cron';
import { deleteUnverifiedUsersOlderThan } from '../models/user.model.js';

export function startCleanupJob() {
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Cleaning up unverified users...');
    await deleteUnverifiedUsersOlderThan(60); // 60 minutes
  });
}
