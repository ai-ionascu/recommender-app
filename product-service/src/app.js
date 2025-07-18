import express from 'express';
import cors from 'cors';
import { runMigration } from './db/migrations/001-initial-schema.js';

import { pool } from './db/db.js';
import productRoutes from './routes/products.js';

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://frontend:80','http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

await runMigration();

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/products', productRoutes);

// Health check route
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    console.log('Health check successful');
    res.status(200).json({
      status: "OK",
      database: "connected"
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({
      status: "ERROR",
      database: "disconnected",
      error: err.message
    });
  }
});

app.listen(process.env.PRODUCT_SERVICE_PORT, '0.0.0.0', () => {
  console.log(`Product Service running on port ${process.env.PRODUCT_SERVICE_PORT}`);
});