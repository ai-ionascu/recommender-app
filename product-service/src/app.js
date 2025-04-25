import express from 'express';
import cors from 'cors';
import { runMigration } from './db/migrations/001-initial-schema.js';

import productRoutes from './routes/products.js';

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://frontend:80','http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

await runMigration();

app.use('/products', productRoutes);

// Rute de verificare
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    db_connection: 'active'
  });
});

app.get('/version', (req, res) => {
  res.json({
    service: 'Product Service',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

app.listen(process.env.PRODUCT_SERVICE_PORT, '0.0.0.0', () => {
  console.log(`Product Service running on port ${process.env.PRODUCT_SERVICE_PORT}`);
});