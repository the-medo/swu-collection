import { expect, test } from 'bun:test';
import { cardLookupInput, cardSearchInput, getCards, searchCards } from './cards.ts';
import { readMcpConfig } from './config.ts';
import { SwuArena, SwuAspect, SwuSet } from '../types/enums.ts';

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

test('green Ambush discovery works without a name and combines type and cost filters', () => {
  const result = searchCards(
    cardSearchInput.parse({
      aspects: ['Command'],
      keywords: ['ambush'],
      cardTypes: ['unit'],
      cost: { min: 2, max: 5 },
      sort: 'cost',
      limit: 25,
    }),
    'https://swubase.com',
  );
  expect(result.total).toBeGreaterThan(1);
  expect(result.cards.map(card => card.cardId)).toContain('coruscant-guard');
  expect(result.cards.map(card => card.cardId)).toContain('agent-kallus--seeking-the-rebels');
  for (const card of result.cards) {
    expect(card.aspects).toContain(SwuAspect.COMMAND);
    expect(card.keywords).toContain('Ambush');
    expect(card.type).toBe('Unit');
    expect(card.cost).toBeGreaterThanOrEqual(2);
    expect(card.cost).toBeLessThanOrEqual(5);
  }
  expect(result.cards.map(card => card.cost)).toEqual(
    [...result.cards.map(card => card.cost)].sort((a, b) => a! - b!),
  );
});

test('aspect modes handle additional and repeated aspects', () => {
  const all = searchCards(
    cardSearchInput.parse({ aspects: ['Command', 'Command'], limit: 25 }),
    'https://swubase.com',
  );
  expect(all.total).toBeGreaterThan(0);
  for (const card of all.cards)
    expect(card.aspects.filter(aspect => aspect === 'Command')).toHaveLength(2);
  const exact = searchCards(
    cardSearchInput.parse({ aspects: ['Command'], aspectMatch: 'exact', limit: 25 }),
    'https://swubase.com',
  );
  expect(exact.total).toBeGreaterThan(0);
  for (const card of exact.cards) expect(card.aspects).toEqual([SwuAspect.COMMAND]);
  const any = searchCards(
    cardSearchInput.parse({ aspects: ['Command', 'Vigilance'], aspectMatch: 'any' }),
    'https://swubase.com',
  );
  expect(any.total).toBeGreaterThan(exact.total);
});

test('rules-text, arena, trait, set and numeric filters constrain returned cards', () => {
  const result = searchCards(
    cardSearchInput.parse({
      text: 'Ambush',
      arenas: ['Ground'],
      traits: ['Trooper'],
      sets: ['twi'],
      power: { min: 1 },
      hp: { min: 1 },
    }),
    'https://swubase.com',
  );
  expect(result.cards.map(card => card.cardId)).toContain('coruscant-guard');
  for (const card of result.cards) {
    expect(card.arenas).toContain(SwuArena.GROUND);
    expect(card.traits).toContain('Trooper');
    expect(card.set).toBe(SwuSet.TWI);
    expect(card.power).toBeGreaterThanOrEqual(1);
    expect(card.hp).toBeGreaterThanOrEqual(1);
  }
  expect(
    searchCards(cardSearchInput.parse({ query: 'qui gon jinn' }), 'https://swubase.com').total,
  ).toBeGreaterThan(0);
});

test('batch details preserve requested order and report unavailable IDs safely', () => {
  const ids = ['coruscant-guard', 'agent-kallus--seeking-the-rebels'];
  const result = getCards(
    cardLookupInput.parse({
      cardIds: [ids[0], '__proto__', ids[1], ids[0], 'missing-preview-id'],
    }),
    'https://swubase.com',
  );
  expect(result.cards.map(card => card.cardId)).toEqual(ids);
  expect(result.missingCardIds).toEqual(['__proto__', 'missing-preview-id']);
  expect(result.cards[0]!.text).toBeString();
  expect(result.cards[0]!.url).toBe('https://swubase.com/cards/detail/coruscant-guard');
});

test('invalid or unbounded filters and batch lookups are rejected', () => {
  for (const input of [
    {},
    { sort: 'cost' },
    { query: '--' },
    { keywords: [] },
    { cost: {} },
    { cost: { min: 5, max: 2 } },
    { cost: { max: -1 } },
    { aspects: ['green'] },
    { query: 'luke', userId: 'other' },
  ]) {
    expect(cardSearchInput.safeParse(input).success).toBe(false);
  }
  for (const cardIds of [[], [' '], Array.from({ length: 26 }, () => 'coruscant-guard')])
    expect(cardLookupInput.safeParse({ cardIds }).success).toBe(false);
});
