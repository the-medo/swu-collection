import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { discussion } from '../../db/schema/discussion.ts';
import { forumThread } from '../../db/schema/forum_thread.ts';
import type { DiscussionAttachment } from './attachments.ts';

export function forumModerator(viewerId?: string) {
  return viewerId
    ? sql<boolean>`EXISTS (SELECT 1 FROM ${user} WHERE ${user.id} = ${viewerId}
    AND 'admin' = ANY(regexp_split_to_array(btrim(coalesce(${user.role}, '')), '[[:space:]]*,[[:space:]]*')))`
    : sql<boolean>`false`;
}
const readable = () =>
  sql`EXISTS (SELECT 1 FROM ${forumThread} WHERE ${forumThread.discussionId} = ${discussion.id})`;

export const forumDiscussionAttachment: DiscussionAttachment = {
  async findDiscussionId(id) {
    if (!z.guid().safeParse(id).success) return undefined;
    const [row] = await db
      .select({ id: forumThread.discussionId })
      .from(forumThread)
      .innerJoin(discussion, eq(discussion.id, forumThread.discussionId))
      .where(and(eq(forumThread.discussionId, id), eq(discussion.type, 'forum')));
    return row?.id;
  },
  readable,
  discoverable: readable,
  thumbnail: sql`NULL::jsonb`,
  policy: viewerId => ({
    type: 'forum',
    readable: readable(),
    moderator: forumModerator(viewerId),
    async lockResource(tx, id) {
      const [row] = await tx
        .select({
          canModerate: forumModerator(viewerId),
          openingCommentId: forumThread.openingCommentId,
        })
        .from(forumThread)
        .where(eq(forumThread.discussionId, id))
        .for('update');
      return row;
    },
    async notificationRecipients(tx, comment) {
      const [thread] = await tx
        .select({ authorId: forumThread.authorId })
        .from(forumThread)
        .where(eq(forumThread.discussionId, comment.discussionId));
      return !comment.parentId && thread?.authorId && thread.authorId !== comment.authorId
        ? [{ recipientUserId: thread.authorId, type: 'comment.reply' }]
        : [];
    },
  }),
  notificationTarget: {
    name: sql`(SELECT ${forumThread.title} FROM ${forumThread} WHERE ${forumThread.discussionId} = ${discussion.id})`,
    url: commentId => sql`(SELECT '/forum/' || ${forumThread.discussionId}::text || '?forumComment=' || ${commentId}::text
      FROM ${forumThread} WHERE ${forumThread.discussionId} = ${discussion.id})`,
  },
};
