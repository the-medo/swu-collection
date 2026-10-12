// CARD_DISCUSSION_DB_TEST=1 bun --env-file=.env.worktree test server/routes/cards/discussion.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { cardDiscussion } from '../../db/schema/card_discussion.ts';
import { discussion } from '../../db/schema/discussion.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import {
  getOfficialCardList,
  invalidatePreviewCardCache,
} from '../../lib/cards/cardListProvider.ts';
import { previewCard } from '../../db/schema/preview_card.ts';
import {
  createPreviewCardPayloadTemplate,
  normalizePreviewCardPayload,
} from '../../lib/cards/previewCardPayload.ts';
import { migratePreviewCardToOfficial } from '../../lib/cards/previewCardMigration.ts';
import { notifications } from '../../lib/notifications/service.ts';
import { cardDiscussionRoute } from './discussion.ts';
import { discussionsRoute } from '../discussions.ts';

test.skipIf(process.env.CARD_DISCUSSION_DB_TEST !== '1')(
  'card discussions are public, lazy, atomic and shared by concurrent first comments',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const existing = new Set((await db.select().from(cardDiscussion)).map(row => row.cardId));
    const cardId = Object.keys(getOfficialCardList()).find(id => !existing.has(id))!;
    const users = [crypto.randomUUID(), crypto.randomUUID()];
    const createdDiscussions: string[] = [];
    const previewIds: string[] = [];
    const beforeDiscussions = await db
      .select()
      .from(discussion)
      .where(eq(discussion.type, 'card-detail'));
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('test-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/cards', cardDiscussionRoute)
      .route('/discussions', discussionsRoute);
    const request = (
      path: string,
      viewer?: string,
      body?: unknown,
      method = body ? 'POST' : 'GET',
    ) =>
      app.request(path, {
        method,
        headers: { 'content-type': 'application/json', ...(viewer ? { 'test-user': viewer } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const doc = (text: string) => {
      const content = emptyPostDocument();
      content.blocks[0].content = [{ type: 'text', text, styles: {} }];
      return content;
    };
    const path = `/cards/${cardId}/discussion`;
    const bindings = () =>
      db.select().from(cardDiscussion).where(eq(cardDiscussion.cardId, cardId));
    try {
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: id,
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      expect((await request(path)).status).toBe(200);
      expect(await (await request(path, users[0])).json()).toEqual({ data: null });
      expect(await bindings()).toHaveLength(0);
      const rejectedComment = await request(`${path}/comments`, users[0], {
        content: doc('f.u.c.k'),
      });
      expect(rejectedComment.status).toBe(400);
      expect(await rejectedComment.json()).toMatchObject({ code: 'PROFANITY_NOT_ALLOWED' });
      expect(await bindings()).toHaveLength(0);
      // A legacy display name is only resolved after first-comment creation has
      // provisionally inserted a discussion and binding. Rejection must undo both.
      await db.update(user).set({ displayName: 'fuck' }).where(eq(user.id, users[1]));
      const legacyMention = emptyPostDocument();
      legacyMention.blocks = [
        {
          id: 'legacy-mention',
          type: 'paragraph',
          props: {},
          children: [],
          content: [
            {
              type: 'swuInline',
              props: {
                data: JSON.stringify({
                  kind: 'mention',
                  user: { id: users[1], displayName: 'An ordinary label' },
                }),
              },
            },
          ],
        },
      ];
      const rejectedMention = await request(`${path}/comments`, users[0], {
        content: legacyMention,
      });
      await db.update(user).set({ displayName: users[1] }).where(eq(user.id, users[1]));
      expect(rejectedMention.status).toBe(400);
      expect(await rejectedMention.json()).toMatchObject({ code: 'PROFANITY_NOT_ALLOWED' });
      expect(await bindings()).toHaveLength(0);
      expect(
        await db.select().from(discussion).where(eq(discussion.type, 'card-detail')),
      ).toHaveLength(beforeDiscussions.length);
      expect(
        (await request(`${path}/comments`, undefined, { content: doc('Anonymous') })).status,
      ).toBe(401);
      expect((await request('/cards/missing-card/discussion')).status).toBe(404);
      expect(
        (
          await request('/cards/missing-card/discussion/comments', users[0], {
            content: doc('Missing'),
          })
        ).status,
      ).toBe(404);
      expect(
        (await request(`${path}/comments`, users[0], { content: emptyPostDocument() })).status,
      ).toBe(400);
      const invalid = doc('Invalid reference');
      invalid.blocks[0].content = [
        {
          type: 'swuInline',
          props: {
            data: JSON.stringify({
              kind: 'mention',
              user: { id: 'missing-user', displayName: 'Missing' },
            }),
          },
        },
      ];
      expect((await request(`${path}/comments`, users[0], { content: invalid })).status).toBe(400);
      expect(await bindings()).toHaveLength(0);
      expect(
        await db.select().from(discussion).where(eq(discussion.type, 'card-detail')),
      ).toHaveLength(beforeDiscussions.length);

      const responses = await Promise.all(
        users.map((id, index) =>
          request(`${path}/comments`, id, { content: doc(`First ${index}`) }),
        ),
      );
      expect(responses.map(response => response.status)).toEqual([201, 201]);
      const comments = await Promise.all(
        responses.map(async response => (await response.json()).data),
      );
      const id = comments[0].discussionId;
      createdDiscussions.push(id);
      expect(comments[1].discussionId).toBe(id);
      expect(await bindings()).toHaveLength(1);
      expect((await (await request(path)).json()).data).toEqual({
        id,
        total: 2,
        canModerate: false,
      });
      expect((await (await request(`/discussions/${id}/comments`)).json()).data).toHaveLength(2);
      expect(
        (await request(`/discussions/${id}/comments`, undefined, { content: doc('Anonymous') }))
          .status,
      ).toBe(401);
      const commentPath = `/discussions/${id}/comments/${comments[0].id}`;
      expect(
        (await request(commentPath, users[1], { content: doc('Other edit'), revision: 1 }, 'PUT'))
          .status,
      ).toBe(403);
      expect((await request(commentPath, users[1], undefined, 'DELETE')).status).toBe(403);
      expect(
        (await request(commentPath, users[0], { content: doc('Edited'), revision: 1 }, 'PUT'))
          .status,
      ).toBe(200);
      const replyResponse = await request(`/discussions/${id}/comments`, users[1], {
        content: doc('Reply'),
        parentId: comments[0].id,
      });
      expect(replyResponse.status).toBe(201);
      const reply = (await replyResponse.json()).data;
      const inbox = (await notifications.list(users[0], false)).items;
      expect(inbox).toHaveLength(1);
      expect(inbox[0]).toMatchObject({
        type: 'comment.reply',
        entityId: reply.id,
        entityName: getOfficialCardList()[cardId].name,
        targetUrl: `/cards/detail/${cardId}?cardTab=rules-discussion&cardComment=${reply.id}`,
      });
      expect(
        (await (await request(`/discussions/${id}/comments/${reply.id}/thread`)).json()).data.path,
      ).toHaveLength(2);
      const own = await request(
        `/discussions/own-comments?attachmentType=card-detail&attachmentId=${cardId}`,
        users[0],
      );
      expect(own.status).toBe(200);
      expect((await own.json()).data).toHaveLength(1);
      expect((await request(commentPath, users[0], undefined, 'DELETE')).status).toBe(200);
      const remaining = (await (await request(`/discussions/${id}/comments`)).json()).data;
      expect(
        remaining.find((comment: { id: string }) => comment.id === comments[0].id).deletedAt,
      ).not.toBeNull();
      expect((await (await request(path)).json()).data.total).toBe(2);

      // Preview discussions retain threads and notification links both when
      // re-keyed and when merged into an existing official-card discussion.
      for (const hasOfficialDiscussion of [false, true]) {
        const officialId = hasOfficialDiscussion
          ? cardId
          : Object.keys(getOfficialCardList()).find(id => id !== cardId && !existing.has(id))!;
        const previewId = `rules-preview-${crypto.randomUUID()}`;
        previewIds.push(previewId);
        const payload = normalizePreviewCardPayload({
          ...createPreviewCardPayloadTemplate(),
          cardId: previewId,
          title: 'Rules preview fixture',
          name: 'Rules preview fixture',
        });
        const [preview] = await db
          .insert(previewCard)
          .values({ cardId: previewId, payload })
          .returning();
        invalidatePreviewCardCache();
        const created = await request(`/cards/${previewId}/discussion/comments`, users[0], {
          content: doc('Preview question'),
        });
        expect(created.status).toBe(201);
        const previewRoot = (await created.json()).data;
        createdDiscussions.push(previewRoot.discussionId);
        const replyResponse = await request(
          `/discussions/${previewRoot.discussionId}/comments`,
          users[1],
          { content: doc('Preview reply'), parentId: previewRoot.id },
        );
        expect(replyResponse.status).toBe(201);
        const previewReply = (await replyResponse.json()).data;
        await migratePreviewCardToOfficial(preview.id, officialId);
        // The cached catalog still has this preview: a stale writer must not
        // recreate its old binding after waiting for the migration lock.
        expect(
          (
            await request(`/cards/${previewId}/discussion/comments`, users[0], {
              content: doc('Late preview comment'),
            })
          ).status,
        ).toBe(404);
        invalidatePreviewCardCache();
        expect((await request(`/cards/${previewId}/discussion`)).status).toBe(404);
        const info = (await (await request(`/cards/${officialId}/discussion`)).json()).data;
        expect(info.id).toBe(hasOfficialDiscussion ? id : previewRoot.discussionId);
        expect(info.total).toBe(hasOfficialDiscussion ? 4 : 2);
        const movedThread = await request(
          `/discussions/${info.id}/comments/${previewReply.id}/thread`,
        );
        expect(movedThread.status).toBe(200);
        expect(
          (await movedThread.json()).data.path.map((comment: { id: string }) => comment.id),
        ).toEqual([previewRoot.id, previewReply.id]);
        const notice = (await notifications.list(users[0], false)).items.find(
          item => item.entityId === previewReply.id,
        );
        expect(notice).toMatchObject({
          entityName: getOfficialCardList()[officialId].name,
          targetUrl: `/cards/detail/${officialId}?cardTab=rules-discussion&cardComment=${previewReply.id}`,
        });
        expect(
          await db.select().from(cardDiscussion).where(eq(cardDiscussion.cardId, previewId)),
        ).toHaveLength(0);
      }
    } finally {
      const rows = await bindings();
      for (const row of rows) createdDiscussions.push(row.discussionId);
      if (createdDiscussions.length)
        await db.delete(discussion).where(inArray(discussion.id, createdDiscussions));
      await db.delete(user).where(inArray(user.id, users));
      if (previewIds.length)
        await db.delete(previewCard).where(inArray(previewCard.cardId, previewIds));
      invalidatePreviewCardCache();
    }
  },
  30_000,
);
