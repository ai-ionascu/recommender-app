import express from 'express';
import { runMigration } from './db/migrations/001-initial-schema.js';

const app = express();
app.use(express.json());

await runMigration();

app.listen(process.env.PRODUCT_SERVICE_PORT, () => {
  console.log(`Product Service running on port ${process.env.PRODUCT_SERVICE_PORT}`);
});