import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const PRODUCT_BASE_URL = process.env.PRODUCT_BASE_URL || 'http://product-service:3000';

app.get('/health', (_, res) => res.json({ ok: true }));

// proxy -> product-service embedded routes
app.get('/reco/similar/:productId', async (req, res) => {
  const { productId } = req.params;
  const { limit } = req.query;
  const url = `${PRODUCT_BASE_URL}/reco/similar/${encodeURIComponent(productId)}?limit=${encodeURIComponent(limit || 8)}`;
  const r = await fetch(url);
  res.status(r.status).send(await r.text());
});

app.get('/reco/fbt/:productId', async (req, res) => {
  const { productId } = req.params;
  const { limit } = req.query;
  const url = `${PRODUCT_BASE_URL}/reco/fbt/${encodeURIComponent(productId)}?limit=${encodeURIComponent(limit || 8)}`;
  const r = await fetch(url);
  res.status(r.status).send(await r.text());
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`[recommender-service] listening on ${PORT}`));
