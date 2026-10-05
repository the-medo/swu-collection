import { expect, test } from 'bun:test';
import { cardSearchInput, searchCards } from './cards.ts';
import { readMcpConfig } from './config.ts';

test('name and ID search return official card text and bounded, stable pages', () => {
  const first = searchCards(
    cardSearchInput.parse({ query: 'darth vader', limit: 1 }),
    'https://swubase.com',
  );
  expect(first.total).toBeGreaterThan(1);
  expect(first.catalog).toBe('official');
  expect(first.cards).toHaveLength(1);
  expect(first.cards[0]!.name.toLowerCase()).toContain('darth vader');
  expect(first.cards[0]!.url).toBe(`https://swubase.com/cards/detail/${first.cards[0]!.cardId}`);
  const second = searchCards(
    cardSearchInput.parse({ query: 'DARTH VADER', limit: 1, offset: 1 }),
    'https://swubase.com',
  );
  expect(second.total).toBe(first.total);
  expect(second.cards[0]!.cardId).not.toBe(first.cards[0]!.cardId);
  const exact = searchCards(
    cardSearchInput.parse({ query: first.cards[0]!.cardId }),
    'https://swubase.com',
  );
  expect(exact.cards.some(card => card.cardId === first.cards[0]!.cardId)).toBe(true);
  expect(
    searchCards(cardSearchInput.parse({ query: 'not-a-real-card-012345' }), 'https://swubase.com')
      .cards,
  ).toEqual([]);
});

test('blank queries, huge pages and malformed deployment configuration fail closed', () => {
  for (const input of [
    { query: ' ' },
    { query: 'a' },
    { query: 'luke', limit: 26 },
    { query: 'luke', offset: -1 },
  ]) {
    expect(cardSearchInput.safeParse(input).success).toBe(false);
  }
  const env = {
    DATABASE_URL: 'postgresql://localhost/test',
    MCP_RESOURCE_URL: 'https://mcp.swubase.com/mcp',
    MCP_AUTH_ISSUER: 'https://swubase.com/api/auth',
  };
  expect(readMcpConfig(env).port).toBe(3210);
  for (const resource of [
    'http://mcp.swubase.com/mcp',
    'https://mcp.swubase.com/mcp?x=1',
    'https://mcp.swubase.com/mcp/',
  ]) {
    expect(() => readMcpConfig({ ...env, MCP_RESOURCE_URL: resource })).toThrow();
  }
  expect(() => readMcpConfig({ ...env, MCP_AUTH_ISSUER: 'https://swubase.com' })).toThrow();
  expect(() => readMcpConfig({ ...env, MCP_ALLOWED_ORIGINS: 'https://example.com/*' })).toThrow();
});
