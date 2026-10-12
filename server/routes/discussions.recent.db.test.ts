// RECENT_DISCUSSIONS_DB_TEST=1 bun --env-file=.env.worktree test server/routes/discussions.recent.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { user } from '../db/schema/auth-schema.ts';
import { deck } from '../db/schema/deck.ts';
import { deckDiscussion } from '../db/schema/deck_discussion.ts';
import { cardPools } from '../db/schema/card_pool.ts';
import { dailyPoolDiscussion } from '../db/schema/daily_pool_discussion.ts';
import { cardDiscussion } from '../db/schema/card_discussion.ts';
import { deckFolder, deckFolderDeck, deckFolderShare } from '../db/schema/deck_folder.ts';
import { discussion, discussionComment } from '../db/schema/discussion.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';
import type {
  DiscussionFeedKind,
  DiscussionFeedPage,
  DiscussionType,
  RecentDiscussion,
} from '../../shared/types/discussions.ts';
import { discussionsRoute } from './discussions.ts';

test.skipIf(process.env.RECENT_DISCUSSIONS_DB_TEST !== '1')(
  'recent threads use creation order and public discovery, including for signed-in owners',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const owner = `recent-${crypto.randomUUID()}`;
    const deckIds = Array.from({ length: 3 }, () => crypto.randomUUID());
    const poolId = crypto.randomUUID();
    const cardId = `recent-card-${crypto.randomUUID()}`;
    const cardThread = crypto.randomUUID();
    const unknownThread = crypto.randomUUID();
    const folderId = crypto.randomUUID();
    const discussionIds = [cardThread, unknownThread];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('test-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/discussions', discussionsRoute);
    const getRecent = async (viewer?: string): Promise<RecentDiscussion[]> => {
      const response = await app.request('/discussions/recent', {
        headers: viewer ? { 'test-user': viewer } : {},
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      return (await response.json()).data;
    };
    const getFeed = async (
      kind: DiscussionFeedKind,
      cursor?: string | null,
      viewer?: string,
      type?: DiscussionType,
    ): Promise<DiscussionFeedPage> => {
      const query = new URLSearchParams({ kind, limit: '2' });
      if (cursor) query.set('cursor', cursor);
      if (type) query.set('type', type);
      const response = await app.request(`/discussions/feed?${query}`, {
        headers: viewer ? { 'test-user': viewer } : {},
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      return response.json();
    };
    const addComment = async (
      discussionId: string,
      day: number,
      parentId?: string,
      deleted = false,
    ) => {
      const content = emptyPostDocument();
      if (content.blocks[0].type === 'paragraph')
        content.blocks[0].content = [{ type: 'text', text: `Thread ${day}`, styles: {} }];
      const [row] = await db
        .insert(discussionComment)
        .values({
          discussionId,
          authorId: owner,
          content,
          parentId,
          depth: parentId ? 1 : 0,
          createdAt: `2097-01-${String(day).padStart(2, '0')}T00:00:00Z`,
          updatedAt: '2099-01-01T00:00:00Z',
          deletedAt: deleted ? '2099-01-01T00:00:00Z' : null,
        })
        .returning();
      return row.id;
    };
    try {
      await db.insert(user).values({
        id: owner,
        name: owner,
        displayName: 'Thread author',
        email: `${owner}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(deck).values(
        deckIds.map((id, index) => ({
          id,
          userId: owner,
          name: `Recent deck ${index}`,
          format: 1,
          leaderCardId1: 'demo-leader',
          leaderCardId2: 'demo-second-leader',
          baseCardId: 'demo-base',
          public: [1, 2, 0][index],
        })),
      );
      const bindings = await db
        .select()
        .from(deckDiscussion)
        .where(inArray(deckDiscussion.deckId, deckIds));
      discussionIds.push(...bindings.map(row => row.discussionId));
      const deckThread = (index: number) =>
        bindings.find(row => row.deckId === deckIds[index])!.discussionId;
      // Link-shared private decks are readable anonymously but must not be advertised.
      await db.insert(deckFolder).values({ id: folderId, userId: owner, name: 'Shared' });
      await db.insert(deckFolderDeck).values({ folderId, deckId: deckIds[2], userId: owner });
      await db.insert(deckFolderShare).values({ folderId, userId: owner, audience: 'link' });
      await db.insert(cardPools).values({
        id: poolId,
        userId: 'swubase',
        name: 'Recent daily pool',
        status: 'ready',
        visibility: 'public',
        dailyDate: '2097-01-03',
        set: 'hmw',
      });
      const [poolBinding] = await db
        .select()
        .from(dailyPoolDiscussion)
        .where(eq(dailyPoolDiscussion.cardPoolId, poolId));
      discussionIds.push(poolBinding.discussionId);
      await db.insert(discussion).values([
        { id: cardThread, type: 'card-detail' },
        { id: unknownThread, type: 'unknown' },
      ]);
      await db
        .insert(cardDiscussion)
        .values({ cardId, cardName: 'Recent card', discussionId: cardThread });
      const older = await addComment(deckThread(0), 1);
      const card = await addComment(cardThread, 2);
      const pool = await addComment(poolBinding.discussionId, 3);
      const newest = await addComment(deckThread(0), 4);
      const reply = await addComment(deckThread(0), 10, older);
      const tiedReply = await addComment(deckThread(0), 10, older);
      const earlierReply = await addComment(deckThread(0), 10, older);
      await db
        .update(discussionComment)
        .set({ createdAt: '2097-01-10T00:00:00.123456Z' })
        .where(inArray(discussionComment.id, [reply, tiedReply]));
      await db
        .update(discussionComment)
        .set({ createdAt: '2097-01-10T00:00:00.123455Z' })
        .where(eq(discussionComment.id, earlierReply));
      await addComment(deckThread(0), 11, undefined, true);
      await addComment(deckThread(1), 12);
      await addComment(deckThread(2), 13);
      await addComment(unknownThread, 14);
      for (const viewer of [undefined, owner]) {
        const rows = await getRecent(viewer);
        expect(rows.map(row => row.id)).toEqual([newest, pool, card]);
        expect(rows[0]).toMatchObject({
          targetName: 'Recent deck 0',
          preview: 'Thread 4',
          author: { id: owner },
        });
        expect(rows[0].targetUrl).toBe(
          `/decks/${deckIds[0]}?deckTab=article&deckComment=${newest}`,
        );
        expect(rows[1].targetUrl).toBe(
          `/?homeMode=today&poolDate=2097-01-03&poolDiscussion=true&poolComment=${pool}`,
        );
        expect(rows[2].targetUrl).toBe(
          `/cards/detail/${cardId}?cardTab=rules-discussion&cardComment=${card}`,
        );
        expect(rows[0]).not.toHaveProperty('content');
        expect(rows.map(row => row.thumbnail)).toEqual([
          {
            kind: 'deck',
            leaderId: 'demo-leader',
            leader2Id: 'demo-second-leader',
            baseId: 'demo-base',
          },
          { kind: 'set', set: 'hmw' },
          { kind: 'card', cardId },
        ]);
        const threads = await getFeed('discussions', undefined, viewer);
        expect(threads.data.map(row => row.id)).toEqual([newest, pool]);
        expect(threads.nextCursor).not.toBeNull();
        const moreThreads = await getFeed('discussions', threads.nextCursor, viewer);
        expect(moreThreads.data.map(row => row.id)).toEqual([card, older]);
        const comments = await getFeed('comments', undefined, viewer);
        expect(comments.data.map(row => row.id)).toEqual([reply, tiedReply].sort().reverse());
        expect(comments.data[0].targetUrl).toContain(`deckComment=${comments.data[0].id}`);
        expect(comments.nextCursor).toContain('123456');
        const moreComments = await getFeed('comments', comments.nextCursor, viewer);
        expect(moreComments.data.map(row => row.id)).toEqual([earlierReply, newest]);
        const deckThreads = await getFeed('discussions', undefined, viewer, 'deck');
        expect(deckThreads.data.map(row => row.id)).toEqual([newest, older]);
        for (const kind of ['discussions', 'comments'] as const) {
          const cards = await getFeed(kind, undefined, viewer, 'card-detail');
          expect(cards.data[0].id).toBe(card);
          expect(cards.data.every(row => row.type === 'card-detail')).toBe(true);
          const pools = await getFeed(kind, undefined, viewer, 'daily-pool');
          expect(pools.data[0].id).toBe(pool);
          expect(pools.data.every(row => row.type === 'daily-pool')).toBe(true);
        }
        const deckComments = await getFeed('comments', undefined, viewer, 'deck');
        expect(deckComments.data.map(row => row.id)).toEqual([reply, tiedReply].sort().reverse());
        const moreDeckComments = await getFeed('comments', deckComments.nextCursor, viewer, 'deck');
        expect(moreDeckComments.data.map(row => row.id)).toEqual([earlierReply, newest]);
      }
      for (const query of [
        'kind=other',
        'kind=discussions&type=other',
        'kind=comments&limit=51',
        'kind=comments&limit=0',
        'kind=comments&cursor=invalid',
        '',
      ]) {
        expect((await app.request(`/discussions/feed?${query}`)).status).toBe(400);
      }
      const end = await getFeed(
        'comments',
        JSON.stringify({ id: crypto.randomUUID(), createdAt: '1900-01-01T00:00:00Z' }),
      );
      expect(end).toEqual({ data: [], nextCursor: null });
      await db
        .update(deck)
        .set({ leaderCardId1: null, leaderCardId2: null, baseCardId: null })
        .where(eq(deck.id, deckIds[0]));
      expect((await getRecent())[0].thumbnail).toEqual({
        kind: 'deck',
        leaderId: null,
        leader2Id: null,
        baseId: null,
      });
      await db
        .update(cardPools)
        .set({ archivedAt: new Date().toISOString() })
        .where(eq(cardPools.id, poolId));
      expect((await getRecent()).map(row => row.id)).toEqual([newest, card, older]);
      await db.update(deck).set({ public: 2 }).where(eq(deck.id, deckIds[0]));
      const hidden = await getRecent(owner);
      expect(hidden.some(row => row.discussionId === deckThread(0))).toBe(false);
      expect(hidden[0].id).toBe(card);
      for (const kind of ['discussions', 'comments'] as const) {
        const hiddenFeed = await getFeed(kind, undefined, owner);
        expect(hiddenFeed.data.some(row => row.discussionId === deckThread(0))).toBe(false);
        expect(hiddenFeed.data[0].id).toBe(card);
        const filteredHidden = await getFeed(kind, undefined, owner, 'deck');
        expect(filteredHidden.data.some(row => row.discussionId === deckThread(0))).toBe(false);
      }
      await db
        .update(discussionComment)
        .set({ deletedAt: new Date().toISOString() })
        .where(eq(discussionComment.id, card));
      expect((await getRecent()).some(row => row.id === card)).toBe(false);
    } finally {
      await db.delete(deckFolder).where(eq(deckFolder.id, folderId));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(cardPools).where(eq(cardPools.id, poolId));
      await db.delete(discussion).where(inArray(discussion.id, discussionIds));
      await db.delete(user).where(eq(user.id, owner));
    }
  },
);
