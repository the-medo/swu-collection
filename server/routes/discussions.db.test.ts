// DECK_DISCUSSION_DB_TEST=1 bun --env-file=.env.worktree test server/routes/discussions.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { user } from '../db/schema/auth-schema.ts';
import { deck } from '../db/schema/deck.ts';
import { deckDiscussion } from '../db/schema/deck_discussion.ts';
import { discussion, discussionComment } from '../db/schema/discussion.ts';
import { deckInformation } from '../db/schema/deck_information.ts';
import { deckFolder, deckFolderDeck, deckFolderShare } from '../db/schema/deck_folder.ts';
import { userNotification } from '../db/schema/user_notification.ts';
import { previewCard } from '../db/schema/preview_card.ts';
import { emptyPostDocument, isPostEmpty } from '../../shared/posts/content.ts';
import { discussionsRoute } from './discussions.ts';
import { deckDiscussionRoute } from './decks/discussion.ts';
import { userSettingsGetRoute } from './user-settings/get.ts';
import { userSettingsPostRoute } from './user-settings/post.ts';
import { notifications } from '../lib/notifications/service.ts';
import * as core from '../lib/discussions/service.ts';
import type { DiscussionPolicy } from '../lib/discussions/policy.ts';
import { getOfficialCardList, invalidatePreviewCardCache } from '../lib/cards/cardListProvider.ts';
import {
  createPreviewCardPayloadTemplate,
  normalizePreviewCardPayload,
} from '../lib/cards/previewCardPayload.ts';

test.skipIf(process.env.DECK_DISCUSSION_DB_TEST !== '1')(
  'reusable discussions preserve threads and notify eligible owners and replied-to users',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const owner = `thread-owner-${crypto.randomUUID()}`;
    const author = `thread-author-${crypto.randomUUID()}`;
    const replier = `thread-replier-${crypto.randomUUID()}`;
    const userIds = [owner, author, replier];
    const deckIds = [crypto.randomUUID(), crypto.randomUUID()];
    const [publicDeck, privateDeck] = deckIds;
    const folderId = crypto.randomUUID();
    const standaloneId = crypto.randomUUID();
    const previewId = `comment-preview-${crypto.randomUUID()}`;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('test-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/discussions', discussionsRoute)
      .route('/deck', deckDiscussionRoute)
      .route('/settings', userSettingsGetRoute)
      .route('/settings', userSettingsPostRoute);
    const request = (
      path: string,
      viewer?: string,
      body?: unknown,
      method = body === undefined ? 'GET' : 'POST',
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
    const events = (id: string) =>
      db
        .select()
        .from(userNotification)
        .where(
          and(
            eq(userNotification.entityType, 'discussion_comment'),
            eq(userNotification.entityId, id),
          ),
        );
    const settings = async (id: string, body: unknown) => {
      expect((await request('/settings', id, body)).status).toBe(200);
    };
    try {
      await db.insert(user).values(
        userIds.map(id => ({
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
      await db.insert(deck).values(
        deckIds.map((id, index) => ({
          id,
          userId: owner,
          name: 'Thread fixture',
          format: 1,
          public: index === 0 ? 1 : 0,
        })),
      );
      await db.insert(deckInformation).values(deckIds.map(deckId => ({ deckId })));
      const bindings = await db
        .select()
        .from(deckDiscussion)
        .where(inArray(deckDiscussion.deckId, deckIds));
      expect(bindings).toHaveLength(2);
      const publicId = bindings.find(row => row.deckId === publicDeck)!.discussionId;
      const privateId = bindings.find(row => row.deckId === privateDeck)!.discussionId;
      expect(publicId).not.toBe(publicDeck);
      const commentsPath = `/discussions/${publicId}/comments`;
      expect((await db.select().from(discussion).where(eq(discussion.id, publicId)))[0].type).toBe(
        'deck',
      );
      // A mismatched/unknown type must never gain deck access via its binding.
      await db.update(discussion).set({ type: 'unregistered' }).where(eq(discussion.id, publicId));
      expect((await request(`/discussions/${publicId}`, owner)).status).toBe(404);
      expect((await request(commentsPath, owner, { content: doc('Denied type') })).status).toBe(
        404,
      );
      await db.update(discussion).set({ type: 'deck' }).where(eq(discussion.id, publicId));

      const post = async (viewer: string, text: string, parentId?: string, path = commentsPath) => {
        const response = await request(path, viewer, { content: doc(text), parentId });
        expect(response.status).toBe(201);
        return (await response.json()).data;
      };
      const roots = async () => await (await request(commentsPath)).json();
      expect((await request(`/discussions/${privateId}`)).status).toBe(404);
      expect((await request(commentsPath, undefined, { content: doc('anonymous') })).status).toBe(
        401,
      );
      const initialSettings = await (await request('/settings', owner)).json();
      expect(initialSettings.notifications_deck_comments).toBe(true);
      expect(initialSettings.notifications_comment_replies).toBe(true);
      await settings(owner, { homepageMode: 'live', notifications_deck_favorites: false });
      await settings(owner, { notifications_deck_comments: false });
      const preserved = await (await request('/settings', owner)).json();
      expect(preserved.homepageMode).toBe('live');
      expect(preserved.notifications_deck_favorites).toBe(false);
      expect(preserved.notifications_comment_replies).toBe(true);
      const muted = await post(author, 'Muted deck notification');
      expect(await events(muted.id)).toHaveLength(0);
      await settings(owner, { notifications_deck_comments: true });
      const parent = await post(author, 'Parent personal prose');
      const mention = {
        type: 'swuInline' as const,
        props: {
          data: JSON.stringify({
            kind: 'mention',
            user: { id: owner, displayName: 'Forged Admin Name' },
          }),
        },
      };
      const mentionDoc = doc('Mention');
      const cardLink = {
        type: 'swuInline' as const,
        props: {
          data: JSON.stringify({
            kind: 'card-link',
            card: { cardId: 'battlefield-marine', variantId: '', name: 'Forged card name' },
          }),
        },
      };
      mentionDoc.blocks[0].content = [mention, cardLink];
      mentionDoc.blocks[0].children = [
        {
          ...doc('Nested').blocks[0],
          content: [structuredClone(mention), structuredClone(cardLink)],
        },
      ];
      mentionDoc.blocks.push({
        ...doc('Table').blocks[0],
        type: 'table',
        content: {
          type: 'tableContent',
          columnWidths: [null],
          rows: [{ cells: [[structuredClone(mention), structuredClone(cardLink)]] }],
        },
      });
      const mentionResponse = await request(commentsPath, author, { content: mentionDoc });
      expect(mentionResponse.status).toBe(201);
      const normalizedMention = (await mentionResponse.json()).data;
      expect(JSON.stringify(normalizedMention.content)).not.toContain('Forged Admin Name');
      expect(JSON.stringify(normalizedMention.content).split(owner).length - 1).toBe(6);
      expect(JSON.stringify(normalizedMention.content).split('card-link').length - 1).toBe(3);
      expect(JSON.stringify(normalizedMention.content)).not.toContain('Forged card name');
      expect(JSON.stringify(normalizedMention.content).split('Battlefield Marine').length - 1).toBe(
        3,
      );
      const cardDocument = (cardId: string, variantId: string, name = 'Forged card name') => {
        const content = doc('Card reference');
        content.blocks[0].content = [
          {
            type: 'swuInline',
            props: {
              data: JSON.stringify({ kind: 'card-link', card: { cardId, variantId, name } }),
            },
          },
        ];
        return content;
      };
      const officialVariant = Object.keys(
        getOfficialCardList()['battlefield-marine']!.variants,
      )[0]!;
      const correctedEdit = await request(
        `${commentsPath}/${normalizedMention.id}`,
        author,
        {
          content: cardDocument('battlefield-marine', officialVariant),
          revision: 1,
        },
        'PUT',
      );
      expect(correctedEdit.status).toBe(200);
      expect(
        JSON.parse((await correctedEdit.json()).data.content.blocks[0].content[0].props.data).card,
      ).toEqual({
        cardId: 'battlefield-marine',
        variantId: officialVariant,
        name: 'Battlefield Marine',
      });
      for (const content of [
        cardDocument('missing-comment-card', ''),
        cardDocument('battlefield-marine', 'missing-printing'),
      ]) {
        expect((await request(commentsPath, author, { content })).status).toBe(400);
        expect(
          (
            await request(
              `${commentsPath}/${normalizedMention.id}`,
              author,
              { content, revision: 2 },
              'PUT',
            )
          ).status,
        ).toBe(400);
      }
      // Preview links use the same public catalog as the editor's picker.
      const template = createPreviewCardPayloadTemplate();
      const previewPayload = normalizePreviewCardPayload({
        ...template,
        cardId: previewId,
        title: 'Comment preview fixture',
        name: 'Comment preview fixture',
      });
      await db.insert(previewCard).values({ cardId: previewId, payload: previewPayload });
      invalidatePreviewCardCache();
      const previewVariant = Object.keys(previewPayload.variants)[0]!;
      const previewEdit = await request(
        `${commentsPath}/${normalizedMention.id}`,
        author,
        {
          content: cardDocument(previewId, previewVariant),
          revision: 2,
        },
        'PUT',
      );
      expect(previewEdit.status).toBe(200);
      expect(
        JSON.parse((await previewEdit.json()).data.content.blocks[0].content[0].props.data).card,
      ).toEqual({ cardId: previewId, variantId: previewVariant, name: 'Comment preview fixture' });
      await db
        .update(previewCard)
        .set({ status: 'archived' })
        .where(eq(previewCard.cardId, previewId));
      invalidatePreviewCardCache();
      expect(
        (await request(commentsPath, author, { content: cardDocument(previewId, previewVariant) }))
          .status,
      ).toBe(400);
      const unknownMention = structuredClone(mentionDoc);
      unknownMention.blocks[0].content = [
        {
          ...mention,
          props: {
            data: JSON.stringify({
              kind: 'mention',
              user: { id: 'missing-user', displayName: 'Unknown' },
            }),
          },
        },
      ];
      expect((await request(commentsPath, author, { content: unknownMention })).status).toBe(400);
      expect(await events(parent.id)).toMatchObject([
        { recipientUserId: owner, type: 'deck.comment' },
      ]);
      const reply = await post(replier, 'Reply personal prose', parent.id);
      expect((await events(reply.id)).map(row => [row.recipientUserId, row.type]).sort()).toEqual(
        [
          [author, 'comment.reply'],
          [owner, 'deck.comment'],
        ].sort(),
      );
      const ownerInbox = (await notifications.list(owner, false)).items;
      expect(ownerInbox.find(item => item.entityId === reply.id)).toMatchObject({
        targetDeckId: publicDeck,
        targetUrl: `/decks/${publicDeck}?deckTab=article&deckComment=${reply.id}`,
        entityName: 'Thread fixture',
        type: 'deck.comment',
      });
      expect(JSON.stringify(ownerInbox)).not.toContain('personal prose');
      await db.update(discussion).set({ type: 'unregistered' }).where(eq(discussion.id, publicId));
      expect(
        (await notifications.list(owner, false)).items.some(item => item.entityId === reply.id),
      ).toBe(false);
      await db.update(discussion).set({ type: 'deck' }).where(eq(discussion.id, publicId));

      expect(reply.parentId).toBe(parent.id);
      expect(reply.depth).toBe(1);
      const rootWithReply = (await roots()).data.find(row => row.id === parent.id);
      expect(rootWithReply.replyCount).toBe(1);
      expect(rootWithReply.replies).toHaveLength(1);
      expect(rootWithReply.replies[0]).toMatchObject({
        id: reply.id,
        parentId: parent.id,
        replies: [],
      });
      expect((await roots()).data.some(row => row.id === reply.id)).toBe(false);
      const secondReply = await post(owner, 'Second reply', parent.id);
      expect((await roots()).data.find(row => row.id === parent.id).replies).toBeUndefined();
      expect((await events(secondReply.id)).map(row => row.recipientUserId)).toEqual([author]);
      const children = await (
        await request(`${commentsPath}?parentId=${parent.id}&limit=1`)
      ).json();
      expect(children.data[0].id).toBe(reply.id);
      const childPage2 = await (
        await request(
          `${commentsPath}?parentId=${parent.id}&limit=1&cursor=${encodeURIComponent(children.nextCursor)}`,
        )
      ).json();
      expect(childPage2.data[0].id).toBe(secondReply.id);
      const deletedAncestor = await post(author, 'Single reply ancestor to clear', muted.id);
      const embeddedGrandchild = await post(owner, 'Only surviving descendant', deletedAncestor.id);
      expect(
        (await request(`${commentsPath}/${deletedAncestor.id}`, owner, undefined, 'DELETE')).status,
      ).toBe(200);
      const singleChain = (await roots()).data.find(row => row.id === muted.id);
      expect(singleChain.replyCount).toBe(1);
      expect(singleChain.replies).toHaveLength(1);
      expect(singleChain.replies[0]).toMatchObject({
        id: deletedAncestor.id,
        authorId: null,
        replyCount: 1,
      });
      expect(isPostEmpty(singleChain.replies[0].content)).toBe(true);
      expect(singleChain.replies[0].replies).toHaveLength(1);
      expect(singleChain.replies[0].replies[0]).toMatchObject({
        id: embeddedGrandchild.id,
        replies: [],
      });
      expect(JSON.stringify(singleChain.replies)).not.toContain('Single reply ancestor to clear');
      await settings(author, { notifications_comment_replies: false });
      const mutedReply = await post(replier, 'Reply muted for author', parent.id);
      expect((await events(mutedReply.id)).map(row => row.recipientUserId)).toEqual([owner]);
      const selfReply = await post(author, 'Self reply', parent.id);
      expect((await events(selfReply.id)).map(row => row.recipientUserId)).toEqual([owner]);
      const ownerParent = await post(owner, 'Owner parent');
      expect(await events(ownerParent.id)).toHaveLength(0);
      const ownerReply = await post(replier, 'Reply to owner', ownerParent.id);
      expect(await events(ownerReply.id)).toMatchObject([
        { recipientUserId: owner, type: 'comment.reply' },
      ]);
      await settings(owner, { notifications_comment_replies: false });
      const fallback = await post(replier, 'Deck preference fallback', ownerParent.id);
      expect(await events(fallback.id)).toMatchObject([
        { recipientUserId: owner, type: 'deck.comment' },
      ]);
      await settings(owner, { notifications_deck_comments: false });
      const fullyMuted = await post(replier, 'Both muted', ownerParent.id);
      expect(await events(fullyMuted.id)).toHaveLength(0);
      await settings(owner, {
        notifications_deck_comments: true,
        notifications_comment_replies: true,
      });
      const privateParent = await post(
        owner,
        'Private parent',
        undefined,
        `/discussions/${privateId}/comments`,
      );
      expect(
        (
          await request(commentsPath, author, {
            content: doc('Wrong discussion'),
            parentId: privateParent.id,
          })
        ).status,
      ).toBe(410);
      let ancestor = parent;
      for (let depth = 1; depth <= 5; depth++) {
        ancestor = await post(author, `Depth ${depth}`, ancestor.id);
        expect(ancestor.depth).toBe(depth);
      }
      const linked = await (await request(`${commentsPath}/${ancestor.id}/thread`, author)).json();
      expect(linked.data.path.map(row => row.depth)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(linked.data.path[0].id).toBe(parent.id);
      expect(linked.data.path.at(-1).id).toBe(ancestor.id);
      expect(
        (await request(commentsPath, author, { content: doc('Too deep'), parentId: ancestor.id }))
          .status,
      ).toBe(400);
      const edited = await request(
        `${commentsPath}/${reply.id}`,
        replier,
        { content: doc('Edited reply'), revision: reply.revision },
        'PUT',
      );
      expect(edited.status).toBe(200);
      expect((await edited.json()).data.parentId).toBe(parent.id);
      expect(
        (
          await request(
            `${commentsPath}/${reply.id}`,
            replier,
            { content: doc('Stale reply'), revision: reply.revision },
            'PUT',
          )
        ).status,
      ).toBe(409);
      const beforeDeletion = (await roots()).total;
      expect(
        (await request(`${commentsPath}/${parent.id}`, owner, undefined, 'DELETE')).status,
      ).toBe(200);
      const tombstone = (await roots()).data.find(row => row.id === parent.id);
      expect(tombstone.deletedAt).toBeTruthy();
      expect(tombstone.author).toBeNull();
      expect(isPostEmpty(tombstone.content)).toBe(true);
      expect(tombstone.replyCount).toBeGreaterThan(0);
      const deletedParentPath = await (
        await request(`${commentsPath}/${ancestor.id}/thread`)
      ).json();
      expect(isPostEmpty(deletedParentPath.data.path[0].content)).toBe(true);
      expect(deletedParentPath.data.path[0].authorId).toBeNull();
      expect((await request(`${commentsPath}/${parent.id}/thread`)).status).toBe(410);
      expect((await roots()).total).toBe(beforeDeletion - 1);
      expect(
        (await notifications.list(owner, false)).items.some(item => item.entityId === parent.id),
      ).toBe(false);
      expect(
        (
          await request(commentsPath, author, {
            content: doc('Deleted parent'),
            parentId: parent.id,
          })
        ).status,
      ).toBe(410);
      const removedAuthorParent = await post(replier, 'Account removal secret');
      const survivor = await post(owner, 'Surviving reply', removedAuthorParent.id);
      await db.delete(user).where(eq(user.id, replier));
      const removed = (await roots()).data.find(row => row.id === removedAuthorParent.id);
      expect(removed.authorId).toBeNull();
      expect(isPostEmpty(removed.content)).toBe(true);
      expect(removed.replyCount).toBe(1);
      const survivingReply = (
        await (await request(`${commentsPath}?parentId=${removed.id}`)).json()
      ).data[0];
      expect(survivingReply.id).toBe(survivor.id);
      const [counter] = await db
        .select()
        .from(deckInformation)
        .where(eq(deckInformation.deckId, publicDeck));
      expect(counter.commentsCount).toBe((await roots()).total);
      await settings(author, { notifications_comment_replies: true });
      await db
        .insert(deckFolder)
        .values({ id: folderId, userId: owner, name: 'Thread private fixture' });
      await db.insert(deckFolderDeck).values({ deckId: privateDeck, folderId });
      await db.insert(deckFolderShare).values({ folderId, userId: owner, audience: 'link' });
      const privateComment = await post(
        author,
        'Private reply',
        privateParent.id,
        `/discussions/${privateId}/comments`,
      );
      await post(
        owner,
        'Private owner reply',
        privateComment.id,
        `/discussions/${privateId}/comments`,
      );
      expect(
        (await notifications.list(author, false)).items.some(
          item => item.targetDeckId === privateDeck,
        ),
      ).toBe(true);
      await db.delete(deckFolderShare).where(eq(deckFolderShare.folderId, folderId));
      expect((await request(`/discussions/${privateId}/comments`, author)).status).toBe(404);
      expect(
        (await request(`/discussions/${privateId}/comments/${privateComment.id}/thread`, author))
          .status,
      ).toBe(404);
      expect(
        (await notifications.list(author, false)).items.some(
          item => item.targetDeckId === privateDeck,
        ),
      ).toBe(false);
      const own = await (
        await request(`/discussions/own-comments?discussionId=${privateId}`, author)
      ).json();
      const attachedOwn = await (
        await request(
          `/discussions/own-comments?attachmentType=deck&attachmentId=${privateDeck}`,
          author,
        )
      ).json();
      expect(attachedOwn.data.map(row => row.id)).toEqual([privateComment.id]);
      expect((await request(`/discussions/own-comments?discussionId=${privateId}`)).status).toBe(
        401,
      );
      expect(
        (
          await request(
            `/discussions/own-comments?attachmentType=unknown&attachmentId=${privateDeck}`,
            author,
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await request(
            `/discussions/own-comments?discussionId=${privateId}&attachmentType=deck&attachmentId=${privateDeck}`,
            author,
          )
        ).status,
      ).toBe(400);
      const invalidResource = await request(
        '/discussions/own-comments?attachmentType=deck&attachmentId=not-a-deck-uuid',
        author,
      );
      expect(invalidResource.status).toBe(200);
      expect((await invalidResource.json()).data).toEqual([]);
      expect((await request(`/deck/${privateDeck}/comments/own`, author)).status).toBe(404);

      expect(own.data.map(row => row.id)).toEqual([privateComment.id]);
      expect(own.data[0].replyCount).toBe(0);
      expect(
        (
          await request(
            `/discussions/${privateId}/comments/${privateComment.id}`,
            author,
            undefined,
            'DELETE',
          )
        ).status,
      ).toBe(200);
      // The same persistence/service works without any deck binding.
      await db.insert(discussion).values({ id: standaloneId, type: 'unregistered' });
      const policy: DiscussionPolicy = {
        readable: sql`true`,
        moderator: sql`false`,
        lockResource: async () => ({ canModerate: false }),
      };
      const independent = await core.createComment(
        standaloneId,
        author,
        doc('Standalone discussion'),
        policy,
      );
      expect('data' in independent).toBe(true);
      if ('error' in independent) throw new Error(independent.error);
      const independentReply = await core.createComment(
        standaloneId,
        owner,
        doc('Standalone reply'),
        policy,
        independent.data.id,
      );
      if ('error' in independentReply) throw new Error(independentReply.error);
      expect(await events(independentReply.data.id)).toMatchObject([
        { recipientUserId: author, type: 'comment.reply' },
      ]);

      expect(await core.getComments(standaloneId, policy, undefined, 20)).toMatchObject({
        data: { total: 2 },
      });
      expect(
        await db.select().from(deckDiscussion).where(eq(deckDiscussion.discussionId, standaloneId)),
      ).toHaveLength(0);
      expect((await request(`/discussions/${standaloneId}`, author)).status).toBe(404);
      await db.delete(deckInformation).where(eq(deckInformation.deckId, publicDeck));
      await db.delete(deck).where(eq(deck.id, publicDeck));
      expect(await db.select().from(discussion).where(eq(discussion.id, publicId))).toHaveLength(0);
      expect(
        await db
          .select()
          .from(discussionComment)
          .where(eq(discussionComment.discussionId, publicId)),
      ).toHaveLength(0);
      expect(
        (await notifications.list(owner, false)).items.some(
          item => item.targetDeckId === publicDeck,
        ),
      ).toBe(false);
    } finally {
      await db.delete(previewCard).where(eq(previewCard.cardId, previewId));
      invalidatePreviewCardCache();
      await db.delete(deckFolder).where(eq(deckFolder.id, folderId));
      await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(discussion).where(eq(discussion.id, standaloneId));
      await db.delete(user).where(inArray(user.id, userIds));
    }
  },
  30_000,
);
