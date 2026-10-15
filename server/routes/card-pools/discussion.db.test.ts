// SWUBASE_DAILY_SEALED_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/routes/card-pools/discussion.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { cardPools } from '../../db/schema/card_pool.ts';
import { cardPoolDecks } from '../../db/schema/card_pool_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { dailyPoolDiscussion } from '../../db/schema/daily_pool_discussion.ts';
import { discussion, discussionComment } from '../../db/schema/discussion.ts';
import { userNotification } from '../../db/schema/user_notification.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import { notifications } from '../../lib/notifications/service.ts';
import { dailyPoolDiscussionRoute } from './discussion.ts';
import { discussionsRoute } from '../discussions.ts';
import { cardPoolsIdDecksPostRoute } from './_id/decks/post.ts';

const enabled = process.env.SWUBASE_DAILY_SEALED_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Use an isolated worktree database.');
}
const doc = (text: string) => {
  const content = emptyPostDocument();
  const paragraph = content.blocks[0];
  if (paragraph.type === 'paragraph') paragraph.content = [{ type: 'text', text, styles: {} }];
  return content;
};
const app = new Hono<AuthExtension>()
  .use('*', async (c, next) => {
    const id = c.req.header('test-user');
    c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
    await next();
  })
  .route('/pools', dailyPoolDiscussionRoute)
  .route('/pools/:id/decks', cardPoolsIdDecksPostRoute)
  .route('/discussions', discussionsRoute);
const request = (path: string, viewer?: string, body?: unknown, method = body ? 'POST' : 'GET') =>
  app.request(path, {
    method,
    headers: { 'content-type': 'application/json', ...(viewer ? { 'test-user': viewer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const createUsers = (ids: string[]) =>
  db.insert(user).values(
    ids.map((id, index) => ({
      id,
      name: id,
      displayName: id,
      email: `${id}@invalid.local`,
      emailVerified: false,
      currency: 'USD',
      role: index === 2 ? 'user, admin ' : 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

test.skipIf(!enabled)(
  'daily pool threads are public, scoped to a day, moderated, and cleaned up with their pool',
  async () => {
    const people = Array.from({ length: 3 }, () => `pool-comment-${crypto.randomUUID()}`);
    const [author, replier, admin] = people;
    const poolIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const [poolId, secondPoolId, ordinaryId] = poolIds;
    let discussionIds: string[] = [];
    try {
      await createUsers(people);
      await db.insert(cardPools).values(
        poolIds.map((id, index) => ({
          id,
          userId: 'swubase',
          name: 'Daily pool thread fixture',
          status: 'ready' as const,
          visibility: 'public' as const,
          dailyDate: index < 2 ? `2098-06-${13 + index}` : null,
        })),
      );
      const bindings = await db
        .select()
        .from(dailyPoolDiscussion)
        .where(inArray(dailyPoolDiscussion.cardPoolId, poolIds));
      expect(bindings).toHaveLength(2);
      discussionIds = bindings.map(row => row.discussionId);
      const id = bindings.find(row => row.cardPoolId === poolId)!.discussionId;
      const secondId = bindings.find(row => row.cardPoolId === secondPoolId)!.discussionId;
      const path = `/discussions/${id}`;
      const comments = `${path}/comments`;
      const binding = await request(`/pools/${poolId}/discussion`);
      expect(binding.status).toBe(200);
      expect(binding.headers.get('cache-control')).toBe('private, no-store');
      expect((await binding.json()).data).toMatchObject({ id, canModerate: false, total: 0 });
      expect((await request(`/pools/${ordinaryId}/discussion`)).status).toBe(404);
      expect((await request(comments)).status).toBe(200);
      expect((await request(comments, undefined, { content: doc('Anonymous post') })).status).toBe(
        401,
      );
      const posted = await request(comments, author, {
        content: doc('Start with the green leader?'),
      });
      expect(posted.status).toBe(201);
      const parent = (await posted.json()).data;
      expect(
        await db.select().from(userNotification).where(eq(userNotification.entityId, parent.id)),
      ).toHaveLength(0);
      const replied = await request(comments, replier, {
        parentId: parent.id,
        content: doc('I would try the blue base.'),
      });
      expect(replied.status).toBe(201);
      const reply = (await replied.json()).data;
      expect(reply).toMatchObject({ parentId: parent.id, depth: 1 });
      const inbox = (await notifications.list(author, false)).items;
      expect(inbox).toHaveLength(1);
      expect(inbox[0]).toMatchObject({
        entityId: reply.id,
        type: 'comment.reply',
        targetDeckId: null,
        targetUrl: `/?homeMode=today&poolDate=2098-06-13&poolDiscussion=true&poolComment=${reply.id}`,
        entityName: 'Daily pool thread fixture',
      });
      const crossPoolReply = await request(`/discussions/${secondId}/comments`, replier, {
        parentId: parent.id,
        content: doc('Wrong day'),
      });
      expect(crossPoolReply.status).toBe(410);
      expect(
        (await (await request(`${path}/comments/${reply.id}/thread`)).json()).data,
      ).toBeDefined();
      expect(
        (
          await request(
            `${comments}/${parent.id}`,
            replier,
            { content: doc('Not mine'), revision: 1 },
            'PUT',
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await request(
            `${comments}/${parent.id}`,
            author,
            { content: doc('Edited idea'), revision: 1 },
            'PUT',
          )
        ).status,
      ).toBe(200);
      expect((await request(`${comments}/${parent.id}`, replier, undefined, 'DELETE')).status).toBe(
        403,
      );
      expect((await (await request(path, admin)).json()).data.canModerate).toBe(true);

      // Hiding or reclassifying a pool revokes access to every generic discussion route.
      for (const change of [
        { visibility: 'private' as const },
        { visibility: 'unlisted' as const },
        { status: 'in_progress' as const },
        { archivedAt: new Date().toISOString() },
        { dailyDate: null },
        { userId: author },
      ]) {
        await db.update(cardPools).set(change).where(eq(cardPools.id, poolId));
        expect((await request(`/pools/${poolId}/discussion`, author)).status).toBe(404);
        expect((await request(path)).status).toBe(404);
        expect((await request(comments, admin, { content: doc('Hidden pool') })).status).toBe(404);
        expect((await notifications.list(author, false)).items).toHaveLength(0);
        await db
          .update(cardPools)
          .set({
            visibility: 'public',
            status: 'ready',
            archivedAt: null,
            dailyDate: '2098-06-13',
            userId: 'swubase',
          })
          .where(eq(cardPools.id, poolId));
      }
      expect(
        (
          await db
            .select()
            .from(dailyPoolDiscussion)
            .where(eq(dailyPoolDiscussion.cardPoolId, poolId))
        )[0].discussionId,
      ).toBe(id);
      await db.update(discussion).set({ type: 'deck' }).where(eq(discussion.id, id));
      expect((await request(path)).status).toBe(404);
      await db.update(discussion).set({ type: 'daily-pool' }).where(eq(discussion.id, id));
      const moderated = await request(`${comments}/${reply.id}`, admin, undefined, 'DELETE');
      expect(moderated.status).toBe(200);
      expect((await (await request(path)).json()).data.total).toBe(1);
      await db.update(cardPools).set({ visibility: 'private' }).where(eq(cardPools.id, poolId));
      const own = await request(
        `/discussions/own-comments?attachmentType=daily-pool&attachmentId=${poolId}`,
        author,
      );
      expect(own.status).toBe(200);
      expect((await own.json()).data.map((row: { id: string }) => row.id)).toContain(parent.id);
      expect((await request(`${comments}/${parent.id}`, author, undefined, 'DELETE')).status).toBe(
        200,
      );
      expect(
        (await db.select().from(discussionComment).where(eq(discussionComment.id, parent.id)))[0]
          .authorId,
      ).toBeNull();

      await db.delete(cardPools).where(inArray(cardPools.id, poolIds));
      expect(
        await db
          .select()
          .from(dailyPoolDiscussion)
          .where(inArray(dailyPoolDiscussion.cardPoolId, poolIds)),
      ).toHaveLength(0);
      expect(
        await db.select().from(discussion).where(inArray(discussion.id, discussionIds)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(discussionComment)
          .where(inArray(discussionComment.discussionId, discussionIds)),
      ).toHaveLength(0);
    } finally {
      await db.delete(cardPools).where(inArray(cardPools.id, poolIds));
      await db.delete(user).where(inArray(user.id, people));
    }
  },
  30_000,
);

test.skipIf(!enabled)(
  'new pool decks inherit all three visibility settings unless explicitly overridden',
  async () => {
    const owner = `pool-visibility-${crypto.randomUUID()}`;
    const poolId = crypto.randomUUID();
    const deckIds: string[] = [];
    try {
      await createUsers([owner]);
      await db
        .insert(cardPools)
        .values({ id: poolId, userId: owner, status: 'ready', visibility: 'private' });
      for (const [visibility, publicValue] of [
        ['private', 0],
        ['unlisted', 2],
        ['public', 1],
      ] as const) {
        await db.update(cardPools).set({ visibility }).where(eq(cardPools.id, poolId));
        const response = await request(`/pools/${poolId}/decks`, owner, {
          name: 'Inherited visibility',
        });
        expect(response.status).toBe(201);
        const created = (await response.json()).data.deck;
        deckIds.push(created.id);
        expect(created.public).toBe(publicValue);
        expect(
          (await db.select().from(cardPoolDecks).where(eq(cardPoolDecks.deckId, created.id)))[0]
            .visibility,
        ).toBe(visibility);
      }
      const response = await request(`/pools/${poolId}/decks`, owner, {
        name: 'Private override',
        visibility: 'private',
      });
      expect(response.status).toBe(201);
      const created = (await response.json()).data.deck;
      deckIds.push(created.id);
      expect(created.public).toBe(0);
      expect(
        (await db.select().from(cardPoolDecks).where(eq(cardPoolDecks.deckId, created.id)))[0]
          .visibility,
      ).toBe('private');
    } finally {
      if (deckIds.length) {
        await db.delete(cardPoolDecks).where(inArray(cardPoolDecks.deckId, deckIds));
        await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
        await db.delete(deck).where(inArray(deck.id, deckIds));
      }
      await db.delete(cardPools).where(eq(cardPools.id, poolId));
      await db.delete(user).where(eq(user.id, owner));
    }
  },
  30_000,
);
