import { and, eq, or, sql } from 'drizzle-orm';
import { deck } from '../../db/schema/deck.ts';
import { deckDiscussion } from '../../db/schema/deck_discussion.ts';
import { discussion, discussionComment } from '../../db/schema/discussion.ts';
import { deckReadAccess } from './deckFolderAccess.ts';
import type { DiscussionPolicy } from '../discussions/policy.ts';
import { createNotifications } from '../notifications/write.ts';

export function deckDiscussionPolicy(viewerId?: string): DiscussionPolicy {
  return {
    readable: sql`EXISTS (SELECT 1 FROM ${deckDiscussion} JOIN ${deck} ON ${deck.id} = ${deckDiscussion.deckId}
      WHERE ${deckDiscussion.discussionId} = ${discussion.id} AND ${deckReadAccess(viewerId)})`,
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
    async onCreated(tx, comment, parent) {
      const [resource] = await tx
        .select({ ownerId: deck.userId })
        .from(deck)
        .innerJoin(deckDiscussion, eq(deckDiscussion.deckId, deck.id))
        .where(eq(deckDiscussion.discussionId, comment.discussionId));
      if (!resource || !comment.authorId) return;
      const events: Parameters<typeof createNotifications>[1] = [];
      if (parent?.authorId && parent.authorId !== comment.authorId) {
        events.push({
          recipientUserId: parent.authorId,
          actorUserId: comment.authorId,
          type: 'comment.reply',
          entityType: 'discussion_comment',
          entityId: comment.id,
          dedupeKey: `discussion.comment:${comment.id}`,
        });
      }
      if (resource.ownerId !== comment.authorId)
        events.push({
          recipientUserId: resource.ownerId,
          actorUserId: comment.authorId,
          type: 'deck.comment',
          entityType: 'discussion_comment',
          entityId: comment.id,
          dedupeKey: `discussion.comment:${comment.id}`,
        });
      await createNotifications(tx, events);
    },
  };
}
