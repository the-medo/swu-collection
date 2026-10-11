import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { cardDiscussion } from '../../db/schema/card_discussion.ts';
import { discussion } from '../../db/schema/discussion.ts';
import type { DiscussionAttachment } from '../discussions/attachments.ts';

const readable = () =>
  sql`EXISTS (SELECT 1 FROM ${cardDiscussion} WHERE ${cardDiscussion.discussionId} = ${discussion.id})`;

export const cardDiscussionAttachment: DiscussionAttachment = {
  async findDiscussionId(cardId) {
    const [row] = await db
      .select({ id: cardDiscussion.discussionId })
      .from(cardDiscussion)
      .innerJoin(discussion, eq(discussion.id, cardDiscussion.discussionId))
      .where(and(eq(cardDiscussion.cardId, cardId), eq(discussion.type, 'card-detail')));
    return row?.id;
  },
  readable,
  // Card discussions have no resource owner; authors manage their own comments.
  policy: () => ({
    type: 'card-detail',
    readable: readable(),
    moderator: sql`false`,
    async lockResource(tx, discussionId) {
      const [row] = await tx
        .select({ id: cardDiscussion.cardId })
        .from(cardDiscussion)
        .where(eq(cardDiscussion.discussionId, discussionId))
        .for('update');
      return row ? { canModerate: false } : undefined;
    },
  }),
  notificationTarget: {
    name: sql`(SELECT ${cardDiscussion.cardName} FROM ${cardDiscussion} WHERE ${cardDiscussion.discussionId} = ${discussion.id})`,
    url: commentId =>
      sql`(SELECT '/cards/detail/' || ${cardDiscussion.cardId} || '?cardTab=rules-discussion&cardComment=' || ${commentId}::text FROM ${cardDiscussion} WHERE ${cardDiscussion.discussionId} = ${discussion.id})`,
  },
};
