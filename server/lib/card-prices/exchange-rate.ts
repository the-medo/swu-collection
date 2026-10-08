import { DOMParser } from 'linkedom';
import { z } from 'zod';
import type { CardPriceExchangeRate } from '../../../types/CardPrices.ts';

const exchangeRateSchema = z.object({
  date: z.iso.date(),
  usdPerEur: z.number().positive(),
});
const cacheMilliseconds = 15 * 60 * 1000;
const dailyRatesUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

export function parseEurUsdExchangeRate(xml: string): CardPriceExchangeRate {
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  const day = document.querySelector('Cube[time]');
  return exchangeRateSchema.parse({
    date: day?.getAttribute('time'),
    usdPerEur: Number(day?.querySelector('Cube[currency="USD"]')?.getAttribute('rate')),
  });
}

export function createEurUsdExchangeRateLoader(fetcher: typeof fetch = fetch, clock = Date.now) {
  let cached: { rate: CardPriceExchangeRate; expiresAt: number } | undefined;
  let pending: Promise<CardPriceExchangeRate> | undefined;
  let retryAfter = 0;
  let lastError: unknown;

  return async (): Promise<CardPriceExchangeRate> => {
    if (cached && cached.expiresAt > clock()) return cached.rate;
    if (retryAfter > clock()) {
      if (cached) return { ...cached.rate, stale: true };
      throw lastError;
    }
    if (!pending) {
      // An expired rate waits for a refresh so new charts use the current publication.
      // The previous rate is returned with a stale marker only if refreshing fails.
      pending = (async () => {
        const response = await fetcher(dailyRatesUrl, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`ECB exchange-rate request failed: ${response.status}`);
        const rate = parseEurUsdExchangeRate(await response.text());
        cached = { rate, expiresAt: clock() + cacheMilliseconds };
        retryAfter = 0;
        lastError = undefined;
        return rate;
      })()
        .catch(error => {
          lastError = error;
          retryAfter = clock() + 60_000;
          if (cached) return { ...cached.rate, stale: true };
          throw error;
        })
        .finally(() => {
          pending = undefined;
        });
    }
    return pending;
  };
}

export const getEurUsdExchangeRate = createEurUsdExchangeRateLoader();
