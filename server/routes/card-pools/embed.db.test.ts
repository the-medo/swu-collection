// SWUBASE_POOL_EMBED_DB_TEST=1 bun --env-file=.env.worktree test server/routes/card-pools/embed.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { cardPools } from '../../db/schema/card_pool.ts';
import { cardPoolsIdEmbedGetRoute } from './_id/embed/get.ts';

const enabled = process.env.SWUBASE_POOL_EMBED_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Use an isolated worktree database.');
}
const app = new Hono<AuthExtension>()
  .use('*', async (c, next) => {
    const id = c.req.header('test-user');
    c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
    await next();
  })
  .route('/pools/:id/embed', cardPoolsIdEmbedGetRoute);
const request = (id: string, viewer?: string) =>
  app.request(`/pools/${id}/embed`, {
    headers: viewer ? { 'test-user': viewer } : {},
  });

test.skipIf(!enabled)(
  'pool embeds expose only shareable sealed metadata and revoke hidden pools for every viewer',
  async () => {
    const owner = `pool-embed-${crypto.randomUUID()}`;
    const id = crypto.randomUUID();
    try {
      await db.insert(user).values({
        id: owner,
        name: owner,
        displayName: owner,
        email: `${owner}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(cardPools).values({
        id,
        userId: owner,
        name: 'My sealed pool',
        description: 'Not part of the embed',
        set: 'SOR',
        type: 'sealed',
        status: 'ready',
        visibility: 'public',
        leaders: 'leader-one,leader-two,leader-one, ,leader-three',
        custom: false,
        edited: false,
      });
      const expected = {
        id,
        name: 'My sealed pool',
        set: 'SOR',
        boosterCount: 4,
        leaders: [
          { cardId: 'leader-one', copies: 2 },
          { cardId: 'leader-two', copies: 1 },
          { cardId: 'leader-three', copies: 1 },
        ],
      };
      for (const visibility of ['public', 'unlisted'] as const) {
        await db.update(cardPools).set({ visibility }).where(eq(cardPools.id, id));
        for (const viewer of [undefined, owner, 'another-reader']) {
          const response = await request(id, viewer);
          expect(response.status).toBe(200);
          expect(response.headers.get('cache-control')).toBe('private, no-store');
          expect(await response.json()).toEqual({ data: expected });
        }
      }
      for (const change of [
        { visibility: 'private' as const },
        { visibility: null },
        { status: 'in_progress' as const },
        { status: null },
        { type: 'draft' as const },
        { archivedAt: new Date().toISOString() },
      ]) {
        await db.update(cardPools).set(change).where(eq(cardPools.id, id));
        for (const viewer of [undefined, owner, 'another-reader']) {
          const response = await request(id, viewer);
          expect(response.status).toBe(404);
          expect(response.headers.get('cache-control')).toBe('private, no-store');
          expect(await response.json()).toEqual({
            message: 'This sealed pool is private or unavailable.',
          });
        }
        await db
          .update(cardPools)
          .set({
            visibility: 'public',
            status: 'ready',
            type: 'sealed',
            archivedAt: null,
          })
          .where(eq(cardPools.id, id));
      }
      await db.update(cardPools).set({ type: 'prerelease' }).where(eq(cardPools.id, id));
      expect((await (await request(id)).json()).data).toEqual({ ...expected, boosterCount: null });
      await db.update(cardPools).set({ type: 'sealed' }).where(eq(cardPools.id, id));
      await db
        .update(cardPools)
        .set({ name: 'Renamed pool', custom: true })
        .where(eq(cardPools.id, id));
      expect((await (await request(id)).json()).data).toEqual({
        ...expected,
        name: 'Renamed pool',
        boosterCount: null,
      });
      await db.update(cardPools).set({ custom: false, edited: true }).where(eq(cardPools.id, id));
      expect((await (await request(id)).json()).data.boosterCount).toBeNull();
      await db
        .update(cardPools)
        .set({ name: null, leaders: null, edited: false })
        .where(eq(cardPools.id, id));
      expect((await (await request(id)).json()).data).toEqual({
        ...expected,
        name: 'Sealed pool',
        leaders: [],
        boosterCount: null,
      });
      await db.delete(cardPools).where(eq(cardPools.id, id));
      expect((await request(id)).status).toBe(404);
      expect((await request('not-a-uuid')).status).toBe(400);
    } finally {
      await db.delete(cardPools).where(eq(cardPools.id, id));
      await db.delete(user).where(eq(user.id, owner));
    }
  },
);
