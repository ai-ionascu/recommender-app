import express from 'express';
import { runMigration } from './db/migrations/001-initial-schema.js';
import { seedProducts } from './db/seed/seed-products.js';
import cors from 'cors';
import { errorHandler } from './errors/errorHandler.js';
import { config } from './config/env.js';

import { runProcessedEventsMigration } from './db/migrations/002-processed-events.js';
import { startOrderPaidConsumer } from './consumers/orderPaid.consumer.js';

import productRoutes from './routes/product.routes.js';
import imageRoutes   from './routes/image.routes.js';
import featureRoutes from './routes/feature.routes.js';
import reviewRoutes  from './routes/review.routes.js';
import mediaRoutes   from './routes/media.routes.js';

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://frontend:80',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// apply database migrations before handling any requests - only in development!!
// seed the database with initial products
// if (config.env === 'development') {
  await runMigration();
  await runProcessedEventsMigration();
  await seedProducts();
// }

startOrderPaidConsumer().catch(err => console.error('[Rabbit consumer] failed:', err));

// Health check route
app.get('/health', (_req, res) => res.json({ status: 'OK' }));

// mount routes
app.use('/products', productRoutes);
app.use('/products/:id/images', imageRoutes);
app.use('/products/:id/features',featureRoutes);
app.use('/products/:id/reviews', reviewRoutes);
app.use('/products/images', mediaRoutes);

// error handler
app.use(errorHandler);

// 404
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Product Service running on port ${config.port}`);
});