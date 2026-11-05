import { expect } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { gameResult } from '../../db/schema/game_result.ts';
import { game, integrationTest } from './test-fixture.ts';

integrationTest(
  'permission-denied resource attempts keep their allowance across refreshes',
  async f => {
    const app = await f.register();
    let token = await f.connect(app, 'profile:read');
    for (let i = 0; i < 60; i++) {
      expect((await f.request('/game-results', 'POST', game, token.access_token)).status).toBe(403);
    }
    const refreshed = await f.refresh(app, token);
    expect(refreshed.status).toBe(200);
    token = await refreshed.json();
    for (let i = 0; i < 60; i++) {
      expect((await f.request('/game-results', 'POST', game, token.access_token)).status).toBe(403);
    }
    expect((await f.request('/game-results', 'POST', game, token.access_token)).status).toBe(429);
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(429);
    expect(await db.select().from(gameResult).where(eq(gameResult.userId, f.player))).toHaveLength(
      0,
    );
  },
);

integrationTest('game submissions validate payloads, card slots and deck ownership', async f => {
  const app = await f.register();
  const token = await f.connect(app);
  expect(
    (await f.request('/game-results', 'POST', { ...game, userId: f.owner }, token.access_token))
      .status,
  ).toBe(400);
  expect((await f.request('/game-results', 'POST', game, 'wrong')).status).toBe(401);
  for (const invalid of [{ leaderCardId: 'capital-city' }, { baseCardKey: 'battlefield-marine' }]) {
    expect(
      (await f.request('/game-results', 'POST', { ...game, ...invalid }, token.access_token))
        .status,
    ).toBe(400);
  }
  expect(
    (
      await f.request(
        '/game-results',
        'POST',
        { ...game, gameId: 'prototype-key', baseCardKey: '__proto__' },
        token.access_token,
      )
    ).status,
  ).toBe(200);
  const deckId = crypto.randomUUID();
  await db.insert(deck).values({ id: deckId, userId: f.owner, format: 1, name: 'Private fixture' });
  expect(
    (await f.request('/game-results', 'POST', { ...game, deckId }, token.access_token)).status,
  ).toBe(404);
});

integrationTest(
  'game retries preserve manual edits, normalize cards and timestamps, and isolate app identities',
  async f => {
    const app = await f.register();
    const token = await f.connect(app);
    const submitted = await f.request('/game-results', 'POST', game, token.access_token);
    expect(submitted.status).toBe(200);
    const saved = (await submitted.json()).data;
    expect(
      (await (await f.request('/game-results', 'POST', game, token.access_token)).json()).data.id,
    ).toBe(saved.id);
    await db
      .update(gameResult)
      .set({ manuallyEdited: true, note: 'Keep my edits', isWinner: false })
      .where(eq(gameResult.id, saved.id));
    expect((await f.request('/game-results', 'POST', game, token.access_token)).status).toBe(200);
    const [preserved] = await db.select().from(gameResult).where(eq(gameResult.id, saved.id));
    expect(preserved).toMatchObject({
      userId: f.player,
      note: 'Keep my edits',
      isWinner: false,
      gameSource: 'integration',
      baseCardKey: 'Vigilance',
      containsUnknownCards: true,
    });
    expect(preserved!.createdAt.slice(0, 19).replace('T', ' ')).toBe('2026-01-02 12:00:00');
    expect(preserved!.otherData).toMatchObject({ finishedAt: '2026-01-02T12:00:00.000Z' });
    const otherApp = await f.register();
    const otherToken = await f.connect(otherApp);
    expect(
      (await (await f.request('/game-results', 'POST', game, otherToken.access_token)).json()).data
        .id,
    ).not.toBe(saved.id);
  },
);

integrationTest(
  'resource limits survive refresh and reconsent, share endpoints, and isolate players and apps',
  async f => {
    const app = await f.register();
    let token = await f.connect(app);
    for (let i = 0; i < 60; i++) {
      expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(200);
    }
    const refreshed = await f.refresh(app, token);
    expect(refreshed.status).toBe(200);
    token = await refreshed.json();
    // Alternate endpoints: they consume the same app/player resource allowance.
    for (let i = 0; i < 30; i++) {
      expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(200);
      expect((await f.request('/game-results', 'POST', game, token.access_token)).status).toBe(200);
    }
    const limited = await f.request('/me', 'GET', undefined, token.access_token);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
    expect(limited.headers.get('Cache-Control')).toContain('no-store');
    const blockedGame = { ...game, gameId: 'blocked-by-rate-limit' };
    expect((await f.request('/game-results', 'POST', blockedGame, token.access_token)).status).toBe(
      429,
    );
    expect(await db.select().from(gameResult).where(eq(gameResult.userId, f.player))).toHaveLength(
      1,
    );
    // A resource limit must neither block token renewal nor reset on renewal.
    const renewed = await f.refresh(app, token);
    expect(renewed.status).toBe(200);
    token = await renewed.json();
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(429);
    token = await f.connect(app);
    expect((await f.request('/me', 'GET', undefined, token.access_token)).status).toBe(429);
    // Reconnection after revocation creates a new row but keeps the same quota.
    expect((await f.request(`/connections/${app.app.clientId}`, 'DELETE')).status).toBe(200);
    token = await f.connect(app);
    expect((await f.request('/game-results', 'POST', blockedGame, token.access_token)).status).toBe(
      429,
    );
    const otherPlayerToken = await f.connect(app, undefined, f.otherPlayer);
    expect(
      (await (await f.request('/me', 'GET', undefined, otherPlayerToken.access_token)).json()).data
        .id,
    ).toBe(f.otherPlayer);
    expect(
      (await f.request('/game-results', 'POST', game, otherPlayerToken.access_token)).status,
    ).toBe(200);
    const otherApp = await f.register();
    const otherAppToken = await f.connect(otherApp);
    expect((await f.request('/me', 'GET', undefined, otherAppToken.access_token)).status).toBe(200);
    expect(
      (await f.request('/game-results', 'POST', game, otherAppToken.access_token)).status,
    ).toBe(200);
    expect(
      await db
        .select()
        .from(gameResult)
        .where(and(eq(gameResult.userId, f.player), eq(gameResult.manuallyEdited, false))),
    ).toHaveLength(2);
  },
);
