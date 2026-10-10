import { z } from 'zod';
import { and, eq, or, sql } from 'drizzle-orm';
import { deck } from '../../db/schema/deck.ts';
import { deckDiscussion } from '../../db/schema/deck_discussion.ts';
import { discussion, discussionComment } from '../../db/schema/discussion.ts';
import { deckReadAccess } from './deckFolderAccess.ts';
import type { DiscussionPolicy } from '../discussions/policy.ts';
import { db } from '../../db';
import type { SQL } from 'drizzle-orm';
import type { DiscussionAttachment } from '../discussions/attachments.ts';

function deckDiscussionPolicy(viewerId?: string): DiscussionPolicy {
  return {
    readable: readableDeckDiscussion(viewerId),
    moderator: viewerId
      ? sql`EXISTS (SELECT 1 FROM ${deckDiscussion} JOIN ${deck} ON ${deck.id} = ${deckDiscussion.deckId}
      WHERE ${deckDiscussion.discussionId} = ${discussion.id} AND ${deck.userId} = ${viewerId})`
      : sql`false`,
    async lockResource(tx, discussionId, ownCommentId) {
      const [resource] = await tx
        .select({ ownerId: deck.userId })
        .from(deck)
        .innerJoin(deckDiscussion, eq(deckDiscussion.deckId, deck.id))
        .where(
          and(
            eq(deckDiscussion.discussionId, discussionId),
            or(
              deckReadAccess(viewerId),
              viewerId && ownCommentId
                ? sql`EXISTS (SELECT 1 FROM ${discussionComment} WHERE ${discussionComment.discussionId} = ${discussionId} AND ${discussionComment.id} = ${ownCommentId} AND ${discussionComment.authorId} = ${viewerId})`
                : undefined,
            ),
          ),
        )
        .for('update', { of: deck });
      return resource ? { canModerate: resource.ownerId === viewerId } : undefined;
    },
    async notificationRecipients(tx, comment) {
      const [resource] = await tx
        .select({ ownerId: deck.userId })
        .from(deck)
        .innerJoin(deckDiscussion, eq(deckDiscussion.deckId, deck.id))
        .where(eq(deckDiscussion.discussionId, comment.discussionId));
      return resource && resource.ownerId !== comment.authorId
        ? [{ recipientUserId: resource.ownerId, type: 'deck.comment' }]
        : [];
    },
  };
}

function readableDeckDiscussion(viewerId?: string | SQL) {
  return sql`EXISTS (SELECT 1 FROM ${deckDiscussion} JOIN ${deck} ON ${deck.id} = ${deckDiscussion.deckId}
    WHERE ${deckDiscussion.discussionId} = ${discussion.id} AND ${deckReadAccess(viewerId)})`;
}

export const deckDiscussionAttachment: DiscussionAttachment = {
  async findDiscussionId(resourceId) {
    if (!z.guid().safeParse(resourceId).success) return undefined;
    const [row] = await db
      .select({ id: deckDiscussion.discussionId })
      .from(deckDiscussion)
      .innerJoin(discussion, eq(discussion.id, deckDiscussion.discussionId))
      .where(and(eq(deckDiscussion.deckId, resourceId), eq(discussion.type, 'deck')));
    return row?.id;
  },
  readable: readableDeckDiscussion,
  policy: deckDiscussionPolicy,
  notificationTarget: {
    name: sql`(SELECT ${deck.name} FROM ${deckDiscussion} JOIN ${deck} ON ${deck.id} = ${deckDiscussion.deckId} WHERE ${deckDiscussion.discussionId} = ${discussion.id})`,
    url: commentId =>
      sql`(SELECT '/decks/' || ${deckDiscussion.deckId}::text || '?deckTab=article&deckComment=' || ${commentId}::text FROM ${deckDiscussion} WHERE ${deckDiscussion.discussionId} = ${discussion.id})`,
    legacyDeckId: sql`(SELECT ${deckDiscussion.deckId}::text FROM ${deckDiscussion} WHERE ${deckDiscussion.discussionId} = ${discussion.id})`,
  },
};
