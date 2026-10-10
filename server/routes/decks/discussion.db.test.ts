// DECK_DISCUSSION_DB_TEST=1 bun --env-file=.env.worktree test server/routes/decks/discussion.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { cardPools } from '../../db/schema/card_pool.ts';
import { deckArticle, deckDiscussion } from '../../db/schema/deck_discussion.ts';
import { discussionComment } from '../../db/schema/discussion.ts';
import { deckFolder, deckFolderDeck, deckFolderShare } from '../../db/schema/deck_folder.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { deleteDecksOwnedByUser } from '../../lib/decks/deleteDecks.ts';
import { updateDeckInformation } from '../../lib/decks/updateDeckInformation.ts';
import { emptyPostDocument, type PostDocument } from '../../../shared/posts/content.ts';
import { discussionsRoute } from '../discussions.ts';
import { deckDiscussionRoute } from './discussion.ts';

test.skipIf(process.env.DECK_DISCUSSION_DB_TEST !== '1')(
  'deck articles and comments enforce access, ownership, revision conflicts, pagination and deletion',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const ownerId = `discussion-owner-${crypto.randomUUID()}`;
    const readerId = `discussion-reader-${crypto.randomUUID()}`;
    const strangerId = `discussion-stranger-${crypto.randomUUID()}`;
    const userIds = [ownerId, readerId, strangerId];
    const publicId = crypto.randomUUID();
    const privateId = crypto.randomUUID();
    const unlistedId = crypto.randomUUID();
    const limitedId = crypto.randomUUID();
    const deckIds = [publicId, privateId, unlistedId, limitedId];
    const poolId = crypto.randomUUID();
    const folderId = crypto.randomUUID();
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const viewerId = c.req.header('x-fixture-user');
        c.set(
          'user',
          viewerId ? ({ id: viewerId } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/deck', deckDiscussionRoute)
      .route('/discussions', discussionsRoute);
    const request = async (
      viewerId: string | null,
      method: string,
      path: string,
      body?: unknown,
    ) => {
      const serialized = body === undefined ? undefined : JSON.stringify(body);
      let url = `/deck/${path}`;
      const match = path.match(/^([^/]+)\/comments(.*)$/);
      if (match) {
        const [binding] = await db
          .select()
          .from(deckDiscussion)
          .where(eq(deckDiscussion.deckId, match[1]));
        url =
          match[2] === '/own'
            ? `/discussions/own-comments?attachmentType=deck&attachmentId=${match[1]}`
            : `/discussions/${binding?.discussionId ?? match[1]}/comments${match[2]}`;
      }
      return app.request(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(viewerId ? { 'x-fixture-user': viewerId } : {}),
          ...(serialized === undefined
            ? {}
            : { 'Content-Length': String(new TextEncoder().encode(serialized).length) }),
        },
        ...(serialized === undefined ? {} : { body: serialized }),
      });
    };
    const document = (text: string): PostDocument => {
      const content = emptyPostDocument();
      content.blocks[0] = {
        ...content.blocks[0],
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text, styles: {} }],
      };
      return content;
    };
    const article = document('Matchup guide');
    const comment = document('Try another main deck card.');
    const count = async (id: string) =>
      (await db.select().from(deckInformation).where(eq(deckInformation.deckId, id)))[0];
    const discussionId = async (id: string) =>
      (await db.select().from(deckDiscussion).where(eq(deckDiscussion.deckId, id)))[0].discussionId;
    try {
      await db.insert(user).values(
        userIds.map(id => ({
          id,
          name: 'Discussion fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(cardPools).values({ id: poolId, userId: ownerId, visibility: 'private' });
      await db.insert(deck).values(
        deckIds.map((id, index) => ({
          id,
          userId: ownerId,
          format: 1,
          name: 'Discussion fixture',
          public: index === 1 ? 0 : index === 2 ? 2 : 1,
          cardPoolId: id === limitedId ? poolId : null,
          updatedAt: new Date('2020-01-01'),
        })),
      );
      await db
        .insert(deckInformation)
        .values(
          deckIds
            .filter(id => id !== limitedId)
            .map(deckId => ({ deckId, favoritesCount: 7, score: 9 })),
        );

      for (const id of [publicId, unlistedId, limitedId]) {
        const response = await request(null, 'GET', `${id}/article`);
        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
        expect((await response.json()).data).toBeNull();
        expect((await request(null, 'GET', `${id}/comments`)).status).toBe(200);
        expect(
          (await request(null, 'PUT', `${id}/article`, { content: article, revision: null }))
            .status,
        ).toBe(401);
        expect((await request(null, 'POST', `${id}/comments`, { content: comment })).status).toBe(
          401,
        );
        expect(
          (await request(readerId, 'PUT', `${id}/article`, { content: article, revision: null }))
            .status,
        ).toBe(403);
        if (id !== publicId)
          expect(
            (await request(ownerId, 'PUT', `${id}/article`, { content: article, revision: null }))
              .status,
          ).toBe(200);
      }
      for (const viewerId of [null, readerId]) {
        expect((await request(viewerId, 'GET', `${privateId}/article`)).status).toBe(404);
        expect((await request(viewerId, 'GET', `${privateId}/comments`)).status).toBe(404);
      }
      expect(
        (await request(readerId, 'POST', `${privateId}/comments`, { content: comment })).status,
      ).toBe(404);
      expect(
        (
          await request(ownerId, 'PUT', `${privateId}/article`, {
            content: article,
            revision: null,
          })
        ).status,
      ).toBe(200);
      const creationRace = await Promise.all([
        request(ownerId, 'PUT', `${publicId}/article`, { content: article, revision: null }),
        request(ownerId, 'PUT', `${publicId}/article`, { content: article, revision: null }),
      ]);
      expect(creationRace.map(response => response.status).sort()).toEqual([200, 409]);
      const revisionRace = await Promise.all([
        request(ownerId, 'PUT', `${publicId}/article`, {
          content: document('First revision'),
          revision: 1,
        }),
        request(ownerId, 'PUT', `${publicId}/article`, {
          content: document('Second revision'),
          revision: 1,
        }),
      ]);
      expect(revisionRace.map(response => response.status).sort()).toEqual([200, 409]);
      const savedArticle = (await (await request(null, 'GET', `${publicId}/article`)).json()).data;
      expect(savedArticle.revision).toBe(2);
      expect(savedArticle.content).not.toEqual(article);
      expect(
        (await db.select().from(deck).where(eq(deck.id, publicId)))[0].updatedAt.getTime(),
      ).toBeGreaterThan(new Date('2020-01-01').getTime());

      await db.insert(deckFolder).values({ id: folderId, userId: ownerId, name: 'Shared fixture' });
      await db.insert(deckFolderDeck).values({ deckId: privateId, folderId });
      await db.insert(deckFolderShare).values({ folderId, userId: ownerId, audience: 'link' });
      expect((await request(null, 'GET', `${privateId}/article`)).status).toBe(200);
      const sharedResponse = await request(readerId, 'POST', `${privateId}/comments`, {
        content: comment,
      });
      expect(sharedResponse.status).toBe(201);
      const sharedComment = (await sharedResponse.json()).data;
      const ownerPrivateResponse = await request(ownerId, 'POST', `${privateId}/comments`, {
        content: article,
      });
      expect(ownerPrivateResponse.status).toBe(201);
      expect(
        (await request(readerId, 'PUT', `${privateId}/article`, { content: article, revision: 1 }))
          .status,
      ).toBe(403);
      await db.delete(deckFolderShare).where(eq(deckFolderShare.folderId, folderId));
      expect((await request(readerId, 'GET', `${privateId}/comments`)).status).toBe(404);
      expect((await request(null, 'GET', `${privateId}/comments/own`)).status).toBe(401);
      const ownComments = await (
        await request(readerId, 'GET', `${privateId}/comments/own`)
      ).json();
      expect(ownComments.data.map(row => row.id)).toEqual([sharedComment.id]);
      expect(
        (await (await request(strangerId, 'GET', `${privateId}/comments/own`)).json()).data,
      ).toEqual([]);
      expect(
        (
          await request(readerId, 'PUT', `${privateId}/comments/${sharedComment.id}`, {
            content: comment,
            revision: 1,
          })
        ).status,
      ).toBe(404);
      expect(
        (await request(readerId, 'POST', `${privateId}/comments`, { content: comment })).status,
      ).toBe(404);
      expect(
        (await request(strangerId, 'DELETE', `${privateId}/comments/${sharedComment.id}`)).status,
      ).toBe(404);
      expect(
        (await request(readerId, 'DELETE', `${privateId}/comments/${sharedComment.id}`)).status,
      ).toBe(200);
      expect((await count(privateId)).commentsCount).toBe(1);
      expect(
        (await (await request(readerId, 'GET', `${privateId}/comments/own`)).json()).data,
      ).toEqual([]);

      const firstResponse = await request(readerId, 'POST', `${publicId}/comments`, {
        content: comment,
      });
      expect(firstResponse.status).toBe(201);
      const first = (await firstResponse.json()).data;
      expect(first.author).toEqual({ id: readerId, displayName: readerId, image: null });
      expect((await count(publicId)).commentsCount).toBe(1);
      expect(
        (
          await request(strangerId, 'PUT', `${publicId}/comments/${first.id}`, {
            content: comment,
            revision: 1,
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(ownerId, 'PUT', `${publicId}/comments/${first.id}`, {
            content: comment,
            revision: 1,
          })
        ).status,
      ).toBe(403);
      expect((await request(strangerId, 'DELETE', `${publicId}/comments/${first.id}`)).status).toBe(
        403,
      );
      expect((await request(readerId, 'GET', `${privateId}/comments/${first.id}`)).status).toBe(
        404,
      );
      const edit = await request(readerId, 'PUT', `${publicId}/comments/${first.id}`, {
        content: document('Edited comment'),
        revision: 1,
      });
      expect(edit.status).toBe(200);
      expect((await edit.json()).data.revision).toBe(2);
      expect(
        (
          await request(readerId, 'PUT', `${publicId}/comments/${first.id}`, {
            content: comment,
            revision: 1,
          })
        ).status,
      ).toBe(409);
      expect((await count(publicId)).commentsCount).toBe(1);
      const created = await Promise.all([
        request(ownerId, 'POST', `${publicId}/comments`, { content: comment }),
        request(readerId, 'POST', `${publicId}/comments`, { content: comment }),
      ]);
      expect(created.every(response => response.status === 201)).toBe(true);
      expect((await count(publicId)).commentsCount).toBe(3);
      const pageOne = await (await request(null, 'GET', `${publicId}/comments?limit=2`)).json();
      const pageTwo = await (
        await request(
          null,
          'GET',
          `${publicId}/comments?limit=2&cursor=${encodeURIComponent(pageOne.nextCursor)}`,
        )
      ).json();
      expect(pageOne.total).toBe(3);
      expect(pageOne.nextCursor).toBeString();
      expect(pageTwo.data).toHaveLength(1);
      expect(pageTwo.nextCursor).toBeNull();
      expect(new Set([...pageOne.data, ...pageTwo.data].map(row => row.id)).size).toBe(3);
      expect((await request(ownerId, 'DELETE', `${publicId}/comments/${first.id}`)).status).toBe(
        200,
      );
      expect((await request(readerId, 'DELETE', `${publicId}/comments/${first.id}`)).status).toBe(
        410,
      );
      expect(
        (
          await request(readerId, 'PUT', `${publicId}/comments/${first.id}`, {
            content: comment,
            revision: 2,
          })
        ).status,
      ).toBe(410);
      expect((await request(readerId, 'GET', `${publicId}/comments/${first.id}`)).status).toBe(410);
      expect((await count(publicId)).commentsCount).toBe(2);

      const paginationIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
      const paginationDiscussionId = await discussionId(unlistedId);
      await db.insert(discussionComment).values(
        paginationIds.map(id => ({
          id,
          discussionId: paginationDiscussionId,
          authorId: readerId,
          content: comment,
          createdAt: '2020-01-01 00:00:00.123456+00',
        })),
      );
      const stableFirst = await (
        await request(null, 'GET', `${unlistedId}/comments?limit=2`)
      ).json();
      expect(JSON.parse(stableFirst.nextCursor).createdAt).toContain('123456');
      expect(
        (await request(ownerId, 'POST', `${unlistedId}/comments`, { content: comment })).status,
      ).toBe(201);
      const nextPath = `${unlistedId}/comments?limit=2&cursor=${encodeURIComponent(stableFirst.nextCursor)}`;
      const stableSecond = await (await request(null, 'GET', nextPath)).json();
      expect(stableSecond.data).toHaveLength(1);
      expect(new Set([...stableFirst.data, ...stableSecond.data].map(row => row.id)).size).toBe(3);
      expect(
        (await request(ownerId, 'DELETE', `${unlistedId}/comments/${stableFirst.data[1].id}`))
          .status,
      ).toBe(200);
      expect((await (await request(null, 'GET', nextPath)).json()).data.map(row => row.id)).toEqual(
        stableSecond.data.map(row => row.id),
      );
      expect((await count(publicId)).favoritesCount).toBe(7);
      expect((await count(publicId)).score).toBe(9);
      const cascaded = await request(strangerId, 'POST', `${publicId}/comments`, {
        content: comment,
      });
      expect(cascaded.status).toBe(201);
      expect((await count(publicId)).commentsCount).toBe(3);
      await db.delete(user).where(eq(user.id, strangerId));
      expect((await count(publicId)).commentsCount).toBe(2);

      for (const [method, path, body] of [
        ['GET', 'invalid/article', undefined],
        ['GET', `${publicId}/comments?cursor=bad`, undefined],
        ['GET', `${publicId}/comments?limit=51`, undefined],
        ['DELETE', `${publicId}/comments/invalid`, undefined],
        ['PUT', `${publicId}/article`, { content: article }],
        ['POST', `${publicId}/comments`, { content: emptyPostDocument() }],
        ['POST', `${publicId}/comments`, { content: { version: 99, blocks: [] } }],
        ['POST', `${publicId}/comments`, { content: document('x'.repeat(17_000)) }],
        ['POST', `${publicId}/comments`, { content: comment, authorId: ownerId }],
        ...[1, 2, 3].map(
          level =>
            [
              'POST',
              `${publicId}/comments`,
              {
                content: {
                  ...comment,
                  blocks: [{ ...comment.blocks[0], type: 'heading', props: { level } }],
                },
              },
            ] as const,
        ),
      ] as const)
        expect((await request(readerId, method, path, body)).status).toBe(400);
      expect(
        (
          await request(ownerId, 'PUT', `${publicId}/article`, {
            content: document('x'.repeat(300_000)),
            revision: 2,
          })
        ).status,
      ).toBe(413);
      expect((await request(null, 'GET', `${crypto.randomUUID()}/article`)).status).toBe(404);
      const cleared = await request(ownerId, 'PUT', `${publicId}/article`, {
        content: emptyPostDocument(),
        revision: 2,
      });
      expect(cleared.status).toBe(200);
      expect((await cleared.json()).data.revision).toBe(3);
      expect(
        (await request(readerId, 'POST', `${limitedId}/comments`, { content: comment })).status,
      ).toBe(201);
      expect(await count(limitedId)).toBeUndefined();
      expect((await (await request(null, 'GET', `${limitedId}/comments`)).json()).total).toBe(1);
      await updateDeckInformation(limitedId);
      expect((await count(limitedId)).commentsCount).toBe(1);
      await db.delete(deckInformation).where(eq(deckInformation.deckId, limitedId));
      const [, concurrentComment] = await Promise.all([
        updateDeckInformation(limitedId),
        request(readerId, 'POST', `${limitedId}/comments`, { content: comment }),
      ]);
      expect(concurrentComment.status).toBe(201);
      expect((await count(limitedId)).commentsCount).toBe(2);
      await updateDeckInformation(limitedId);
      expect((await count(limitedId)).commentsCount).toBe(2);
      await db.delete(deckInformation).where(eq(deckInformation.deckId, limitedId));
      await Promise.all([
        updateDeckInformation(limitedId),
        db.delete(user).where(eq(user.id, readerId)),
      ]);
      expect((await count(limitedId)).commentsCount).toBe(0);
      const deletedDiscussionId = await discussionId(limitedId);
      expect((await deleteDecksOwnedByUser(ownerId, [limitedId])).status).toBe('deleted');
      expect(
        await db.select().from(deckArticle).where(eq(deckArticle.deckId, limitedId)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(discussionComment)
          .where(eq(discussionComment.discussionId, deletedDiscussionId)),
      ).toHaveLength(0);
    } finally {
      await db.delete(deckFolder).where(eq(deckFolder.id, folderId));
      await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(cardPools).where(eq(cardPools.id, poolId));
      await db.delete(user).where(inArray(user.id, userIds));
    }
  },
  30_000,
);
