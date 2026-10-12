// FORUM_DB_TEST=1 bun --env-file=.env.worktree test server/routes/discussions.forum.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { user } from '../db/schema/auth-schema.ts';
import { discussion, discussionComment } from '../db/schema/discussion.ts';
import { forumThread } from '../db/schema/forum_thread.ts';
import { userNotification } from '../db/schema/user_notification.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';
import { discussionsRoute } from './discussions.ts';

test.skipIf(process.env.FORUM_DB_TEST !== '1')(
  'forum topics validate content, retain one opening post in discovery, and enforce management permissions',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const owner = `forum-owner-${crypto.randomUUID()}`;
    const other = `forum-other-${crypto.randomUUID()}`;
    const admin = `forum-admin-${crypto.randomUUID()}`;
    const ids: string[] = [];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('test-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/discussions', discussionsRoute);
    const request = (
      path: string,
      viewer?: string,
      body?: unknown,
      method = body ? 'POST' : 'GET',
    ) =>
      app.request(`/discussions${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...(viewer ? { 'test-user': viewer } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const doc = (text: string) => {
      const content = emptyPostDocument();
      content.blocks[0].content = [{ type: 'text', text, styles: { bold: true } }];
      return content;
    };
    try {
      await db
        .insert(user)
        .values(
          [owner, other, admin].map(id => ({
            id,
            name: id,
            displayName: id,
            email: `${id}@invalid.local`,
            emailVerified: false,
            currency: 'USD',
            role: id === admin ? 'user, admin' : 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        );
      expect(
        (await request('/forum', undefined, { title: 'Test', content: doc('Body') })).status,
      ).toBe(401);
      for (const input of [
        { title: ' ', content: doc('Body') },
        { title: 'x'.repeat(161), content: doc('Body') },
        { title: 'Empty', content: emptyPostDocument() },
      ]) {
        expect((await request('/forum', owner, input)).status).toBe(400);
      }
      for (const input of [
        { title: 'fuck this', content: doc('Body'), field: 'title' },
        { title: 'Weekend ideas', content: doc('fuck this'), field: 'content' },
      ]) {
        const { field, ...body } = input;
        const result = await request('/forum', owner, body);
        expect(result.status).toBe(400);
        expect(await result.json()).toMatchObject({ code: 'PROFANITY_NOT_ALLOWED', field });
      }
      const invalidMention = doc('');
      invalidMention.blocks[0].content = [
        {
          type: 'swuInline',
          props: {
            data: JSON.stringify({
              kind: 'mention',
              user: { id: 'missing-forum-user', displayName: 'Missing' },
            }),
          },
          content: [],
        },
      ];
      expect(
        (await request('/forum', owner, { title: 'Invalid mention', content: invalidMention }))
          .status,
      ).toBe(400);
      expect(
        await db.select().from(forumThread).where(eq(forumThread.authorId, owner)),
      ).toHaveLength(0);

      const response = await request('/forum', owner, {
        title: '  Weekend ideas  ',
        content: doc('My opening post'),
      });
      expect(response.status).toBe(201);
      const topic = (await response.json()).data;
      ids.push(topic.id);
      expect(topic.title).toBe('Weekend ideas');
      for (const [viewer, manage] of [
        [undefined, false],
        [owner, true],
        [other, false],
        [admin, true],
      ] as const) {
        const result = await request(`/forum/${topic.id}`, viewer);
        expect(result.status).toBe(200);
        expect((await result.json()).data.canManage).toBe(manage);
      }
      const added = await request(`/${topic.id}/comments`, other, {
        content: doc('A response to the topic'),
      });
      expect(added.status).toBe(201);
      const comment = (await added.json()).data;
      const nested = await request(`/${topic.id}/comments`, owner, {
        content: doc('A nested reply'),
        parentId: comment.id,
      });
      expect(nested.status).toBe(201);
      const notices = await db
        .select()
        .from(userNotification)
        .where(eq(userNotification.entityId, comment.id));
      expect(
        notices.some(row => row.recipientUserId === owner && row.type === 'comment.reply'),
      ).toBe(true);
      const feed = (await (await request('/feed?kind=discussions')).json()).data;
      expect(
        feed
          .filter((entry: { discussionId: string }) => entry.discussionId === topic.id)
          .map((entry: { id: string }) => entry.id),
      ).toEqual([topic.openingCommentId]);
      expect(
        feed.find((entry: { id: string }) => entry.id === topic.openingCommentId),
      ).toMatchObject({
        type: 'forum',
        targetName: 'Weekend ideas',
        thumbnail: null,
        preview: 'My opening post',
        targetUrl: `/forum/${topic.id}?forumComment=${topic.openingCommentId}`,
      });
      const comments = (await (await request('/feed?kind=comments')).json()).data;
      expect(comments.some((entry: { id: string }) => entry.id === comment.id)).toBe(true);
      for (const kind of ['discussions', 'comments']) {
        const filtered = (await (await request(`/feed?kind=${kind}&type=forum`)).json()).data;
        expect(filtered.every((entry: { type: string }) => entry.type === 'forum')).toBe(true);
        expect(
          filtered.some((entry: { id: string }) => entry.id === topic.openingCommentId),
        ).toBe(true);
      }
      for (const viewer of [owner, admin]) {
        const result = await request(
          `/${topic.id}/comments/${topic.openingCommentId}`,
          viewer,
          undefined,
          'DELETE',
        );
        expect(result.status).toBe(409);
        expect((await result.json()).error).toContain('Delete discussion');
      }
      expect(
        (await (await request('/feed?kind=discussions')).json()).data.some(
          (entry: { id: string }) => entry.id === topic.openingCommentId,
        ),
      ).toBe(true);
      expect(
        (await request(`/${topic.id}/comments/${comment.id}`, other, undefined, 'DELETE')).status,
      ).toBe(200);
      const invalidTitle = await request(`/forum/${topic.id}`, owner, { title: ' ' }, 'PATCH');
      expect(invalidTitle.status).toBe(400);
      expect((await invalidTitle.json()).error).toBe('Give your discussion a title.');
      expect(
        (await request(`/forum/${topic.id}`, other, { title: 'Hijacked' }, 'PATCH')).status,
      ).toBe(403);
      expect(
        (await request(`/forum/${topic.id}`, undefined, { title: 'Hijacked' }, 'PATCH')).status,
      ).toBe(401);
      expect(
        (await request(`/forum/${topic.id}`, owner, { title: 'Updated title' }, 'PATCH')).status,
      ).toBe(200);
      expect((await (await request(`/forum/${topic.id}`)).json()).data.title).toBe('Updated title');
      const rejectedTitle = await request(
        `/forum/${topic.id}`,
        owner,
        { title: 'fuck this' },
        'PATCH',
      );
      expect(rejectedTitle.status).toBe(400);
      expect(await rejectedTitle.json()).toMatchObject({
        code: 'PROFANITY_NOT_ALLOWED',
        field: 'title',
      });
      expect((await (await request(`/forum/${topic.id}`)).json()).data.title).toBe('Updated title');
      expect(
        (
          await request(
            `/${topic.id}/comments/${topic.openingCommentId}`,
            other,
            { content: doc('Hijacked'), revision: 1 },
            'PUT',
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await request(
            `/${topic.id}/comments/${topic.openingCommentId}`,
            owner,
            { content: doc('Updated body'), revision: 1 },
            'PUT',
          )
        ).status,
      ).toBe(200);

      // Exercise the exact sanitization block with the new FK, then roll back all changes.
      const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const block = sanitizer.match(/DO \$deck_discussion\$[\s\S]*?\$deck_discussion\$;/)![0];
      const rollback = new Error('rollback sanitizer smoke check');
      try {
        await db.transaction(async tx => {
          await tx.execute(sql.raw(block));
          expect(await tx.select().from(forumThread)).toHaveLength(0);
          expect(await tx.select().from(discussionComment)).toHaveLength(0);
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      }
      expect((await request(`/forum/${topic.id}`)).status).toBe(200);
      expect((await request(`/forum/${topic.id}`, other, undefined, 'DELETE')).status).toBe(403);
      expect((await request(`/forum/${topic.id}`, owner, undefined, 'DELETE')).status).toBe(200);
      expect((await request(`/forum/${topic.id}`)).status).toBe(404);
      expect((await request(`/${topic.id}/comments`)).status).toBe(404);
      expect(
        await db
          .select()
          .from(discussionComment)
          .where(eq(discussionComment.discussionId, topic.id)),
      ).toHaveLength(0);
      const second = (
        await (
          await request('/forum', owner, { title: 'Moderator removal', content: doc('Body') })
        ).json()
      ).data;
      ids.push(second.id);
      expect((await request(`/forum/${second.id}`, admin, undefined, 'DELETE')).status).toBe(200);
    } finally {
      if (ids.length) await db.delete(discussion).where(inArray(discussion.id, ids));
      await db.delete(user).where(inArray(user.id, [owner, other, admin]));
    }
  },
);
