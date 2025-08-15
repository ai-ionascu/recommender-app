import express from 'express';
import { requireAuth } from './middleware/requireAuth.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { AppError } from './utils/errors.js';
import mongoose from 'mongoose';
import { getChannel } from './config/rabbit.js';

const app = express();

// webhook Stripe (raw) -> mounted in dedicated router
app.use('/payments', paymentRoutes);

// JSON parser for the rest
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'order-service' }));

// readiness: confirming conexion to MongoDB and RabbitMQ
app.get('/ready', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1; // 1 = connected
  let rabbit = false;
  try {
    // try to get/create a channel (without publishing)
    await getChannel();
    rabbit = true;
  } catch (_e) {
    rabbit = false;
  }
  const ok = mongo && rabbit;
  res.status(ok ? 200 : 503).json({ mongo, rabbit, ok });
});

app.use('/cart', requireAuth, cartRoutes);
app.use('/orders', requireAuth, orderRoutes);

app.use((_req, _res, next) => next(new AppError('Not Found', 404)));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
  res.status(500).json({ error: 'Server error' });
});

export default app;
