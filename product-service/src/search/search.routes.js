import { Router } from 'express';
import * as searchController from '../search/search.controller.js';

export const searchRouter = Router();

searchRouter.use((req, _res, next) => {
  console.log('[searchRouter]', req.method, req.originalUrl);
  next();
});

// endpoint de debug ca să vezi clar header-ele în Network tab
searchRouter.get('/_debug', (req, res) => {
  res.status(200);
  res.set({
    'Cache-Control': 'no-store',
    'X-Search-Handler': 'composite-countries-v1',
    'X-Facets-Global-Countries': 'test',
    'X-Facets-Wine-Countries': 'test',
    'X-Facets-Spirits-Countries': 'test',
    'X-Facets-Beer-Countries': 'test',
  });
  res.json({ ok: true });
});

searchRouter.get('/', searchController.search);
searchRouter.get('/autocomplete', searchController.autocomplete);
