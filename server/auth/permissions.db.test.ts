import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { auth, type AuthExtension } from './auth.ts';
import { requireAdmin } from './requireAdmin.ts';
import { db } from '../db';
import { session, user } from '../db/schema/auth-schema.ts';
import { deck } from '../db/schema/deck.ts';
import { deckCard } from '../db/schema/deck_card.ts';
import { deckInformation } from '../db/schema/deck_information.ts';
import { meta } from '../db/schema/meta.ts';
import { userHasAdminAccess } from '../lib/utils/userHasAdminAccess.ts';
import { deckIdCardPutRoute } from '../routes/decks/_id/card/put.ts';
import { deckIdCardPostRoute } from '../routes/decks/_id/card/post.ts';
import { deckIdPutRoute } from '../routes/decks/_id/put.ts';
import { metaPostRoute } from '../routes/meta/post.ts';
import { SwuSet } from '../../types/enums.ts';

const enabled = process.env.SWUBASE_PERMISSIONS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Permission tests require an isolated worktree database.');
}

describe.skipIf(!enabled)('real Better Auth permissions in application routes', () => {
  const fixture = `permissions-test-${crypto.randomUUID()}`;
  const roles = {
    owner: 'user',
    stranger: 'user',
    organizer: 'organizer',
    admin: 'admin',
    mixed: 'moderator,admin',
  } as const;
  type Actor = keyof typeof roles;
  const userId = (actor: string) => `${fixture}-${actor}`;
  const deckId = crypto.randomUUID();
  const cookies: Partial<Record<Actor, string>> = {};

  // Use real signed sessions, permission checks, route handlers and database
  // writes. Mount only these routes so the fixture has no external side effects.
  const app = new Hono<AuthExtension>()
    .onError((_error, c) => c.json({ message: 'Internal Server Error' }, 500))
    .use('*', async (c, next) => {
      const current = await auth.api.getSession({ headers: c.req.raw.headers });
      c.set('user', current?.user ?? null);
      c.set('session', current?.session ?? null);
      await next();
    })
    .route('/api/deck/:id/card', deckIdCardPutRoute)
    .route('/api/deck/:id/card', deckIdCardPostRoute)
    .route('/api/deck/:id', deckIdPutRoute)
    .route('/api/meta', metaPostRoute)
    .get('/admin-check', async c => {
      const result = await requireAdmin(c);
      if (result.response) return result.response;
      return c.json({ userId: result.user.id });
    });

  const request = (path: string, method: string, actor: Actor | null, body?: unknown) =>
    app.request(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: process.env.BETTER_AUTH_URL!,
        ...(actor ? { Cookie: cookies[actor]! } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const cardRequest = (
    method: 'PUT' | 'POST',
    actor: Actor | null,
    board: number,
    quantity: number,
  ) =>
    request(
      `/api/deck/${deckId}/card`,
      method,
      actor,
      method === 'PUT'
        ? { id: { deckId, cardId: 'sor_001', board }, data: { quantity } }
        : { cardId: 'sor_001', board, quantity },
    );

  beforeAll(async () => {
    await db.insert(user).values(
      Object.entries(roles).map(([actor, role]) => ({
        id: userId(actor),
        name: userId(actor),
        displayName: userId(actor),
        email: `${userId(actor)}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    await db.insert(deck).values({ id: deckId, userId: userId('owner'), format: 1, name: fixture });
    const cookieName = getCookies({
      baseURL: process.env.BETTER_AUTH_URL!,
      advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
    }).sessionToken.name;
    for (const actor of Object.keys(roles) as Actor[]) {
      const token = crypto.randomUUID();
      await db.insert(session).values({
        id: crypto.randomUUID(),
        token,
        userId: userId(actor),
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });
      cookies[actor] = (
        await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
      ).split(';')[0]!;
    }
  });

  afterAll(async () => {
    await db.delete(meta).where(eq(meta.name, fixture));
    await db.delete(deckCard).where(eq(deckCard.deckId, deckId));
    await db.delete(deckInformation).where(eq(deckInformation.deckId, deckId));
    await db.delete(deck).where(eq(deck.id, deckId));
    await db.delete(user).where(inArray(user.id, Object.keys(roles).map(userId)));
  });

  test('owner can update, increment and remove cards on every board', async () => {
    for (const board of [1, 2, 3]) {
      const put = await cardRequest('PUT', 'owner', board, 2);
      expect(put.status).toBe(201);
      expect((await put.json()).data).toMatchObject({ deckId, board, quantity: 2 });
      const post = await cardRequest('POST', 'owner', board, 1);
      expect(post.status).toBe(201);
      expect((await post.json()).data.quantity).toBe(3);
      const removed = await cardRequest('PUT', 'owner', board, 0);
      expect(removed.status).toBe(201);
      expect(
        await db
          .select()
          .from(deckCard)
          .where(and(eq(deckCard.deckId, deckId), eq(deckCard.board, board))),
      ).toHaveLength(0);
    }
  });

  test('card mutations deny anonymous and non-owners, while allowing an admin', async () => {
    for (const method of ['PUT', 'POST'] as const) {
      await db.insert(deckCard).values({ deckId, cardId: 'sor_001', board: 1, quantity: 1 });
      for (const actor of [null, 'stranger', 'organizer'] as const) {
        const response = await cardRequest(method, actor, 1, 2);
        expect(response.status).toBe(401);
        expect(
          (await db.select().from(deckCard).where(eq(deckCard.deckId, deckId)))[0]!.quantity,
        ).toBe(1);
      }
      const allowed = await cardRequest(method, 'admin', 1, 2);
      expect(allowed.status).toBe(201);
      expect((await allowed.json()).data.quantity).toBe(method === 'PUT' ? 2 : 3);
      await db.delete(deckCard).where(eq(deckCard.deckId, deckId));
    }
  });

  test('deck metadata updates preserve owner and admin access', async () => {
    for (const [actor, status] of [
      [null, 401],
      ['stranger', 404],
      ['organizer', 404],
    ] as const) {
      const response = await request(`/api/deck/${deckId}`, 'PUT', actor, {
        name: 'Forbidden edit',
      });
      expect(response.status).toBe(status);
      expect((await db.select().from(deck).where(eq(deck.id, deckId)))[0]!.name).toBe(fixture);
    }
    for (const actor of ['owner', 'admin'] as const) {
      const name = `${fixture}-${actor}`;
      const response = await request(`/api/deck/${deckId}`, 'PUT', actor, { name });
      expect(response.status).toBe(200);
      expect((await response.json()).data.name).toBe(name);
      expect((await db.select().from(deck).where(eq(deck.id, deckId)))[0]!.name).toBe(name);
    }
  });

  test('shared admin checks handle ordinary, organizer and multiple roles', async () => {
    expect((await request('/admin-check', 'GET', null)).status).toBe(401);
    for (const actor of Object.keys(roles) as Actor[]) {
      const allowed = actor === 'admin' || actor === 'mixed';
      expect(await userHasAdminAccess(userId(actor))).toBe(allowed);
      expect((await request('/admin-check', 'GET', actor)).status).toBe(allowed ? 200 : 403);
    }
    expect(
      (
        await auth.api.userHasPermission({
          body: { userId: userId('organizer'), permissions: { tournament: ['create'] } },
        })
      ).success,
    ).toBe(true);
    expect(
      (
        await auth.api.userHasPermission({
          body: { userId: userId('organizer'), permissions: { tournament: ['import'] } },
        })
      ).success,
    ).toBe(false);
  });

  test('action-specific routes deny forbidden roles and accept the admin', async () => {
    const body = { set: SwuSet.SOR, name: fixture, format: 1, date: '2026-10-05', season: 0 };
    for (const [actor, status] of [
      [null, 401],
      ['owner', 403],
      ['organizer', 403],
    ] as const) {
      expect((await request('/api/meta', 'POST', actor, body)).status).toBe(status);
      expect(await db.select().from(meta).where(eq(meta.name, fixture))).toHaveLength(0);
    }
    const response = await request('/api/meta', 'POST', 'admin', body);
    expect(response.status).toBe(201);
    expect((await response.json()).data.name).toBe(fixture);
    expect(await db.select().from(meta).where(eq(meta.name, fixture))).toHaveLength(1);
  });
});
