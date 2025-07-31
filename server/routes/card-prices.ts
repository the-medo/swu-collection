import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { cardPricesCreateSourceRoute } from './card-prices/create-source.ts';
import { cardPricesDeleteSourceRoute } from './card-prices/delete-source.ts';

export const cardPricesRoute = new Hono<AuthExtension>()
  .route('/create-source', cardPricesCreateSourceRoute)
  .route('/delete-source', cardPricesDeleteSourceRoute);