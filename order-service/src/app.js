import express from 'express';
import { requireAuth } from './middleware/requireAuth.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import { AppError } from './utils/errors.js';
import mongoose from 'mongoose';
import { getChannel } from './config/rabbit.js';
import { PaymentController } from './controllers/payment.controller.js';
import recoRoutes from './routes/recommendation.routes.js';

const app = express();

/** Stripe webhook — MUST be before express.json() and use express.raw() */
// Path without /api (direct hit to service)
app.post('/payments/webhook', express.raw({ type: 'application/json' }), PaymentController.webhook);
// Path with /api (when requests arrive through the gateway unchanged)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), PaymentController.webhook);

/** JSON parser for everything else */
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'order-service' }));

app.get('/ready', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  let rabbit = false;
  try { await getChannel(); rabbit = true; } catch { rabbit = false; }
  const ok = mongo && rabbit;
  res.status(ok ? 200 : 503).json({ mongo, rabbit, ok });
});

app.use('/cart', requireAuth, cartRoutes);
app.use('/orders', requireAuth, orderRoutes);
app.use(recoRoutes);

app.use((_req, _res, next) => next(new AppError('Not Found', 404)));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
  res.status(500).json({ error: 'Server error' });
});

export default app;
