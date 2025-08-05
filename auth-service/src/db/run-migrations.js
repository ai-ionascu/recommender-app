import { runMigration } from './migrations/001-initial-schema.js';
import { runSeed } from './seed/seed-users.js';

async function main() {
  try {
    await runMigration();
    await runSeed();
    console.log('[auth-db] Initialization complete!');
  } catch (error) {
    console.error('[auth-db] Initialization failed:', error.message);
    process.exit(1);
  }
}

main();
