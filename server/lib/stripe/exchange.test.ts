import { expect, test } from 'bun:test';
import { createExchangeRates, dollarsFromEuroCents, parseExchangeRates } from './exchange.ts';
import { supportCheckoutInput } from '../../../shared/types/support.ts';

const xml = `<Envelope><Cube><Cube time="2026-10-08"><Cube currency="USD" rate="1.1186"/></Cube><Cube time="2026-10-07"><Cube currency="USD" rate="1.1"/></Cube></Cube></Envelope>`;
test('EUR rewards round half-up to USD cents without floating point errors', () => {
  expect(dollarsFromEuroCents(500, '1.1186')).toBe(559);
  expect(dollarsFromEuroCents(5, '1.1')).toBe(6);
  expect(dollarsFromEuroCents(250, '1.1')).toBe(275);
  expect(() => dollarsFromEuroCents(1.5, '1.1')).toThrow();
  expect(() => dollarsFromEuroCents(100, 'bad')).toThrow();
});
test('ECB parser and payment-date lookup handle weekends and refuse stale rates', async () => {
  let calls = 0;
  const rates = createExchangeRates(async () => {
    calls++;
    return new Response(xml);
  });
  expect(parseExchangeRates(xml)[0]).toEqual({ date: '2026-10-08', usdPerEur: '1.1186' });
  expect(await rates.at(new Date('2026-10-11T12:00:00Z'))).toEqual({
    date: '2026-10-08',
    usdPerEur: '1.1186',
  });
  expect(await rates.at(new Date('2026-10-07T12:00:00Z'))).toEqual({
    date: '2026-10-07',
    usdPerEur: '1.1',
  });
  expect(calls).toBe(1);
  await expect(rates.at(new Date('2026-10-20T12:00:00Z'))).rejects.toThrow();
});
test('old payments load the historical feed and never use a future FX rate', async () => {
  const urls: string[] = [];
  const rates = createExchangeRates(async url => {
    urls.push(String(url));
    return new Response(
      urls.length === 1
        ? xml
        : '<Envelope><Cube time="2020-01-02"><Cube currency="USD" rate="1.1234"/></Cube></Envelope>',
    );
  });
  expect(await rates.at(new Date('2020-01-03T00:00:00Z'))).toEqual({
    date: '2020-01-02',
    usdPerEur: '1.1234',
  });
  expect(urls[1]).toEndWith('/eurofxref-hist.xml');
  await expect(rates.at(new Date('2019-01-01T00:00:00Z'))).rejects.toThrow();
});
test('ECB outages are briefly cached without granting an estimated conversion', async () => {
  let calls = 0;
  const rates = createExchangeRates(async () => {
    calls++;
    return new Response('', { status: 503 });
  });
  await expect(rates.at(new Date())).rejects.toThrow();
  await expect(rates.at(new Date())).rejects.toThrow();
  expect(calls).toBe(1);
});

test('checkout contracts prohibit client reward amounts, owners and arbitrary tiers', () => {
  const input = { kind: 'monthly', currency: 'EUR', amount: 5, requestId: crypto.randomUUID() };
  expect(supportCheckoutInput.safeParse(input).success).toBe(true);
  expect(supportCheckoutInput.safeParse({ ...input, amount: 6 }).success).toBe(false);
  expect(supportCheckoutInput.safeParse({ ...input, userId: 'another-user' }).success).toBe(false);
  expect(
    supportCheckoutInput.safeParse({
      kind: 'one_time',
      currency: 'USD',
      requestId: input.requestId,
      amount: 100,
    }).success,
  ).toBe(false);
});
