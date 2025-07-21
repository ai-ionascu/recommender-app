import express from 'express';
import cors from 'cors';
import { errorHandler } from './errors/errorHandler.js';
import productRoutes from './routes/products.js';
import { config } from './config/env.js';

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware for logging requests
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
//   next();
// });

// Health check route
app.get('/health', (_req, res) => res.json({ status: 'OK' }));
// app.get('/health', async (req, res) => {
//   try {
//     await pool.query('SELECT 1');
//     console.log('Health check successful');
//     res.status(200).json({
//       status: "OK",
//       database: "connected"
//     });
//   } catch (err) {
//     console.error('Health check failed:', err);
//     res.status(500).json({
//       status: "ERROR",
//       database: "disconnected",
//       error: err.message
//     });
//   }
// });
app.use('/products', productRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Product Service running on port ${config.port}`);
});