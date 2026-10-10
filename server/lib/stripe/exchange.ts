import { DOMParser } from 'linkedom';
import { SupportError } from './config.ts';

export type ExchangeRate = { usdPerEur: string; date: string };
export function parseExchangeRates(xml: string): ExchangeRate[] {
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  const cubes = document.querySelectorAll('Cube[time]') as unknown as NodeListOf<Element>;
  return Array.from(cubes)
    .flatMap(cube => {
      const date = cube.getAttribute('time')!;
      const rate = cube.querySelector('Cube[currency="USD"]')?.getAttribute('rate');
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && rate && /^\d{1,2}\.\d{1,8}$/.test(rate)
        ? [{ usdPerEur: rate, date }]
        : [];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function dollarsFromEuroCents(amount: number, rate: string) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !/^\d{1,2}\.\d{1,8}$/.test(rate))
    throw new SupportError('This support amount requires review.');
  const [whole, fraction] = rate.split('.');
  const divisor = 10n ** BigInt(fraction.length);
  const multiplier = BigInt(whole + fraction);
  const converted = (BigInt(amount) * multiplier + divisor / 2n) / divisor;
  if (converted <= 0n || converted > 2_000_000_000n)
    throw new SupportError('This support amount requires review.');
  return Number(converted);
}

export function createExchangeRates(
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch,
) {
  let cached: { rows: ExchangeRate[]; until: number; full: boolean } | undefined;
  let failedUntil = 0;
  async function load(full: boolean) {
    if (cached && cached.until > Date.now() && (!full || cached.full)) return cached.rows;
    if (failedUntil > Date.now())
      throw new SupportError('Currency conversion is temporarily unavailable.');
    try {
      const response = await fetcher(
        `https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist${full ? '' : '-90d'}.xml`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (!response.ok) throw new SupportError('Currency conversion is temporarily unavailable.');
      const text = await response.text();
      if (text.length > 32_000_000)
        throw new SupportError('Currency conversion is temporarily unavailable.');
      const rows = parseExchangeRates(text);
      if (!rows.length) throw new SupportError('Currency conversion is temporarily unavailable.');
      cached = { rows, until: Date.now() + 60 * 60 * 1000, full };
      return rows;
    } catch (error) {
      failedUntil = Date.now() + 60_000;
      throw error;
    }
  }
  return {
    async at(date: Date): Promise<ExchangeRate> {
      const day = date.toISOString().slice(0, 10);
      let rows = await load(false);
      if (day < rows[rows.length - 1].date) rows = await load(true);
      const rate = rows.find(row => row.date <= day);
      if (!rate || date.getTime() - Date.parse(rate.date + 'T00:00:00Z') > 8 * 86400_000)
        throw new SupportError('A payment-date currency conversion rate is unavailable.');
      return rate;
    },
  };
}
export const exchangeRates = createExchangeRates();
