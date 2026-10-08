import { expect, spyOn, test } from 'bun:test';
import { createCardPricesExchangeRateRoute } from './exchange-rate.ts';

test('returns the current rate and its publication date', async () => {
  const route = createCardPricesExchangeRateRoute(async () => ({
    date: '2026-10-08',
    usdPerEur: 1.2,
  }));
  const response = await route.request('/');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ data: { date: '2026-10-08', usdPerEur: 1.2 } });
});

test('reports a temporary rate failure without exposing upstream error details', async () => {
  const logging = spyOn(console, 'error').mockImplementation(() => {});
  try {
    const route = createCardPricesExchangeRateRoute(async () => {
      throw new Error('Upstream internals');
    });
    const response = await route.request('/');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      message: 'Could not load the current EUR/USD exchange rate. Please try again.',
    });
  } finally {
    logging.mockRestore();
  }
});
