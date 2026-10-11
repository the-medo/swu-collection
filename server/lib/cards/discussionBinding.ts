import { eq, inArray, sql } from 'drizzle-orm';
import { cardDiscussion } from '../../db/schema/card_discussion.ts';
import { discussion, discussionComment } from '../../db/schema/discussion.ts';
import type { DiscussionTransaction } from '../discussions/policy.ts';

export async function lockCardDiscussions(tx: DiscussionTransaction, cardIds: string[]) {
  for (const cardId of [...new Set(cardIds)].sort())
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`card-detail:${cardId}`}, 0))`,
    );
}

export async function migrateCardDiscussion(
  tx: DiscussionTransaction,
  fromCardId: string,
  officialCardId: string,
  cardName: string,
) {
  await lockCardDiscussions(tx, [fromCardId, officialCardId]);
  const bindings = await tx
    .select()
    .from(cardDiscussion)
    .where(inArray(cardDiscussion.cardId, [fromCardId, officialCardId]))
    .orderBy(cardDiscussion.cardId)
    .for('update');
  const source = bindings.find(row => row.cardId === fromCardId);
  const target = bindings.find(row => row.cardId === officialCardId);
  if (source && source !== target) {
    if (target) {
      // Match comment-write lock order: bindings, then discussions. Move the
      // entire tree in one statement so parent IDs and reply notifications survive.
      await tx
        .select({ id: discussion.id })
        .from(discussion)
        .where(inArray(discussion.id, [source.discussionId, target.discussionId]))
        .orderBy(discussion.id)
        .for('update');
      await tx
        .update(discussionComment)
        .set({ discussionId: target.discussionId })
        .where(eq(discussionComment.discussionId, source.discussionId));
      await tx.delete(discussion).where(eq(discussion.id, source.discussionId));
    } else {
      await tx
        .update(cardDiscussion)
        .set({ cardId: officialCardId })
        .where(eq(cardDiscussion.cardId, fromCardId));
    }
  }
  await tx
    .update(cardDiscussion)
    .set({ cardName })
    .where(eq(cardDiscussion.cardId, officialCardId));
}
