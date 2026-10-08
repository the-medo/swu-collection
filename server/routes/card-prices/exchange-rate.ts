import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { getEurUsdExchangeRate } from '../../lib/card-prices/exchange-rate.ts';

export function createCardPricesExchangeRateRoute(loadRate = getEurUsdExchangeRate) {
  return new Hono<AuthExtension>().get('/', async c => {
    try {
      return c.json({ data: await loadRate() });
    } catch (error) {
      console.error('Could not load the EUR/USD exchange rate:', error);
      return c.json(
        { message: 'Could not load the current EUR/USD exchange rate. Please try again.' },
        503,
      );
    }
  });
}

export const cardPricesExchangeRateRoute = createCardPricesExchangeRateRoute();
