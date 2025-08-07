import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { cardPricesCreateSourceRoute } from './card-prices/create-source.ts';
import { cardPricesDeleteSourceRoute } from './card-prices/delete-source.ts';
import { cardPricesBulkLoadRoute } from './card-prices/bulk-load.ts';
import { cardPricesGetHistoryRoute } from './card-prices/get-history.ts';
import { cardPricesGetSingleRoute } from './card-prices/get-single.ts';
import { cardPricesGetSourcesRoute } from './card-prices/get-sources.ts';

export const cardPricesRoute = new Hono<AuthExtension>()
  .route('/', cardPricesGetSingleRoute)
  .route('/sources', cardPricesGetSourcesRoute)
  .route('/create-source', cardPricesCreateSourceRoute)
  .route('/delete-source', cardPricesDeleteSourceRoute)
  .route('/bulk-load', cardPricesBulkLoadRoute)
  .route('/history', cardPricesGetHistoryRoute);
