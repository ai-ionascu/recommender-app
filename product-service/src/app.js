import express from 'express';
import cors from 'cors';

import { config } from './config/env.js';
import { runMigration } from './db/migrations/001-initial-schema.js';
import { runProcessedEventsMigration } from './db/migrations/002-processed-events.js';
import { seedProducts } from './db/seed/seed-products.js';

import productRoutes from './routes/product.routes.js';
import imageRoutes   from './routes/image.routes.js';
import featureRoutes from './routes/feature.routes.js';
import reviewRoutes  from './routes/review.routes.js';
import mediaRoutes   from './routes/media.routes.js';

import { errorHandler } from './errors/errorHandler.js';

// ES API + worker
import { searchRouter } from './search/search.routes.js';
import { startSearchSyncWorker } from './workers/searchSync.worker.js';
import { waitForElasticsearch } from './search/esClient.js';

// RabbitMQ consumer for stock adjustment on order.paid
import { startOrderPaidConsumer } from './consumers/orderPaid.consumer.js';

// recommender system
import recoRoutes from './search/reco.routes.js';

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://frontend',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [
    'X-Search-Handler',
    'X-Facets-Global-Countries',
    'X-Facets-Wine-Countries',
    'X-Facets-Spirits-Countries',
    'X-Facets-Beer-Countries'
  ]
}));

// define once and reuse
const EXPOSE_HEADERS = 'X-Search-Handler, X-Facets-Global-Countries, X-Facets-Wine-Countries, X-Facets-Spirits-Countries, X-Facets-Beer-Countries';
const searchHeaders = (_req, res, next) => {
  res.setHeader('Access-Control-Expose-Headers', EXPOSE_HEADERS);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  next();
};

app.use((_, res, next) => {
  res.setHeader('Access-Control-Expose-Headers', EXPOSE_HEADERS);
  next();
});

// apply database migrations before handling any requests - only in development!!
// seed the database with initial products
// if (config.env === 'development') {
  // await runMigration();
  // await runProcessedEventsMigration();
  // await seedProducts();
// }

// Health check route
app.get('/health', (_req, res) => res.json({ status: 'OK' }));

// mount routes
app.use('/products', productRoutes);
app.use('/api/products', productRoutes);
app.use('/products/:id/images', imageRoutes);
app.use('/products/:id/features',featureRoutes);
app.use('/products/:id/reviews', reviewRoutes);
app.use('/products/images', mediaRoutes);

// mount search routes
app.use('/search', searchHeaders, searchRouter);
app.use('/api/search', searchHeaders, searchRouter);

// recommender system
app.use(recoRoutes);

// error handler
app.use(errorHandler);

// 404
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Product Service running on port ${config.port}`);
});

// workers starting upon available connection, waiting ES for sync worker
(async () => {
  try {
    try {
      await waitForElasticsearch();
      startSearchSyncWorker().catch(err => console.error('[SearchSync] failed to start:', err));
    } catch (e) {
      console.log('[Elasticsearch] not reachable, search sync worker not started:', e.message);
    }
    startOrderPaidConsumer().catch(err => console.error('[Rabbit consumer] failed:', err));
  } catch (e) {
    console.log('[Bootstrap] background init failed:', e);
  }
})();