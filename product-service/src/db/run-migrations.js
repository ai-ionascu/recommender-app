import { runMigration } from './migrations/001-initial-schema.js';
import { seedProducts } from './seed/seed-products.js';

async function main() {
  try {
    console.log('Aplying migration...');
    await runMigration();
    console.log('Running seed...');
    await seedProducts();
    console.log('Done. Check database.');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();