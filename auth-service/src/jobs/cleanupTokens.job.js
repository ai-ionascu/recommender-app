import cron from 'node-cron';
import pool from '../config/db.js';

let isRunning = false;

export const startTokenCleanupJob = () => {
  // run every hour
  cron.schedule('0 * * * *', async () => {
    if (isRunning) {
      console.log('[Cron] Previous token cleanup still running, skipping this execution...');
      return;
    }

    try {
      isRunning = true;
      console.log('[Cron] Running token cleanup job...');

      // debug: display the number of tokens before deletion
      const beforeCounts = await getTokenCounts();
      console.log('[Cron] Tokens before cleanup:', beforeCounts);

      // delete
      await pool.query('DELETE FROM email_verification_tokens WHERE expires_at < CURRENT_TIMESTAMP');
      await pool.query('DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP');
      await pool.query('DELETE FROM email_change_tokens WHERE expires_at < CURRENT_TIMESTAMP');

      // debug: display the number of tokens after deletion
      const afterCounts = await getTokenCounts();
      console.log('[Cron] Tokens after cleanup:', afterCounts);
      console.log('[Cron] Tokens deleted:', {
        emailVerification: beforeCounts.emailVerification - afterCounts.emailVerification,
        passwordReset: beforeCounts.passwordReset - afterCounts.passwordReset,
        emailChange: beforeCounts.emailChange - afterCounts.emailChange
      });

    } catch (err) {
      console.error('[Cron] Token cleanup failed:', err.message);
    } finally {
      isRunning = false;
    }
  });
};

// token cleanup function debugging tool - counts tokens in each table
async function getTokenCounts() {
  const emailVerificationCount = await pool.query('SELECT COUNT(*) FROM email_verification_tokens');
  const passwordResetCount = await pool.query('SELECT COUNT(*) FROM password_reset_tokens');
  const emailChangeCount = await pool.query('SELECT COUNT(*) FROM email_change_tokens');

  return {
    emailVerification: parseInt(emailVerificationCount.rows[0].count),
    passwordReset: parseInt(passwordResetCount.rows[0].count),
    emailChange: parseInt(emailChangeCount.rows[0].count)
  };
}