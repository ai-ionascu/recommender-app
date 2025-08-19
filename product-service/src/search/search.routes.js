import { Router } from 'express';
import * as searchController from '../search/search.controller.js';

export const searchRouter = Router();

searchRouter.get('/', searchController.search);
searchRouter.get('/autocomplete', searchController.autocomplete);
