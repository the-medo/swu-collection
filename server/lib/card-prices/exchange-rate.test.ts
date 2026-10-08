import { expect, test } from 'bun:test';
import { createEurUsdExchangeRateLoader, parseEurUsdExchangeRate } from './exchange-rate.ts';

const xml = (rate = '1.2', date = '2026-10-08') => `<?xml version="1.0"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <Cube><Cube time='${date}'><Cube currency='GBP' rate='0.8'/><Cube currency='USD' rate='${rate}'/></Cube></Cube>
</gesmes:Envelope>`;

test('reads the USD rate and publication date from the ECB daily feed', () => {
  expect(parseEurUsdExchangeRate(xml())).toEqual({ date: '2026-10-08', usdPerEur: 1.2 });
  for (const invalid of [
    xml('0'),
    xml('-1'),
    xml('NaN'),
    xml('Infinity'),
    xml('1.2', '2026-02-31'),
    '<html>Unavailable</html>',
  ])
    expect(() => parseEurUsdExchangeRate(invalid)).toThrow();
});

test('shares concurrent requests, caches for fifteen minutes, and refreshes afterward', async () => {
  let requests = 0;
  let clock = 0;
  const fetcher = (async () => {
    requests++;
    return new Response(xml(requests === 1 ? '1.2' : '1.3'));
  }) as typeof fetch;
  const load = createEurUsdExchangeRateLoader(fetcher, () => clock);
  const rates = await Promise.all([load(), load(), load()]);
  expect(requests).toBe(1);
  expect(rates.every(rate => rate.usdPerEur === 1.2)).toBe(true);
  clock = 15 * 60 * 1000 - 1;
  expect((await load()).usdPerEur).toBe(1.2);
  clock++;
  expect((await load()).usdPerEur).toBe(1.3);
  expect(requests).toBe(2);
});

test('backs off for one minute after a failure without inventing a rate', async () => {
  let requests = 0;
  let clock = 0;
  const fetcher = (async () => {
    requests++;
    return requests === 1 ? new Response('Unavailable', { status: 503 }) : new Response(xml());
  }) as typeof fetch;
  const load = createEurUsdExchangeRateLoader(fetcher, () => clock);
  await expect(load()).rejects.toThrow('503');
  await expect(load()).rejects.toThrow('503');
  expect(requests).toBe(1);
  clock += 60_000;
  expect((await load()).usdPerEur).toBe(1.2);
  expect(requests).toBe(2);
});

test('keeps the last successful rate with an explicit stale marker during a refresh failure', async () => {
  let requests = 0;
  let clock = 0;
  const fetcher = (async () => {
    requests++;
    return requests === 2
      ? new Response('Unavailable', { status: 503 })
      : new Response(xml(requests === 1 ? '1.2' : '1.3'));
  }) as typeof fetch;
  const load = createEurUsdExchangeRateLoader(fetcher, () => clock);
  expect(await load()).toEqual({ date: '2026-10-08', usdPerEur: 1.2 });
  clock += 15 * 60 * 1000;
  expect(await load()).toEqual({ date: '2026-10-08', usdPerEur: 1.2, stale: true });
  expect(await load()).toEqual({ date: '2026-10-08', usdPerEur: 1.2, stale: true });
  expect(requests).toBe(2);
  clock += 60_000;
  expect(await load()).toEqual({ date: '2026-10-08', usdPerEur: 1.3 });
  expect(requests).toBe(3);
});
