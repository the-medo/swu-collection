import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { cardDiscussion } from '../../db/schema/card_discussion.ts';
import { discussion } from '../../db/schema/discussion.ts';
import { getMergedCardList, getOfficialCardList } from './cardListProvider.ts';
import { cardDiscussionAttachment } from './discussionAttachment.ts';
import { createPreparedComment, getDiscussionInfo } from '../discussions/service.ts';
import { prepareCommentReferences } from '../discussions/references.ts';
import { lockCardDiscussions } from './discussionBinding.ts';
import { previewCard } from '../../db/schema/preview_card.ts';
import type { PostDocument } from '../../../shared/posts/content.ts';
import type { DiscussionInfo } from '../../../shared/types/discussions.ts';
import type { DiscussionResult } from '../discussions/policy.ts';

const missingCard = { error: 'Card not found.', status: 404 as const };

export async function getCardDiscussion(
  cardId: string,
): Promise<DiscussionResult<DiscussionInfo | null>> {
  if (!Object.hasOwn(await getMergedCardList(), cardId)) return missingCard;
  const id = await cardDiscussionAttachment.findDiscussionId(cardId);
  return id ? getDiscussionInfo(id, cardDiscussionAttachment.policy()) : { data: null };
}

export async function createCardComment(cardId: string, viewerId: string, content: PostDocument) {
  const cards = await getMergedCardList();
  if (!Object.hasOwn(cards, cardId)) return missingCard;
  const references = await prepareCommentReferences(content);
  return db.transaction(async tx => {
    // Serialize first posts for this card, including when no binding exists yet.
    await lockCardDiscussions(tx, [cardId]);
    // A preview may have migrated while this writer waited for the lock.
    if (!Object.hasOwn(getOfficialCardList(), cardId)) {
      const [active] = await tx
        .select({ id: previewCard.id })
        .from(previewCard)
        .where(and(eq(previewCard.cardId, cardId), eq(previewCard.status, 'active')))
        .for('share');
      if (!active) return missingCard;
    }
    const [binding] = await tx
      .select({ id: cardDiscussion.discussionId })
      .from(cardDiscussion)
      .where(eq(cardDiscussion.cardId, cardId));
    let id = binding?.id;
    if (!id) {
      const [created] = await tx.insert(discussion).values({ type: 'card-detail' }).returning();
      id = created.id;
      await tx
        .insert(cardDiscussion)
        .values({ cardId, cardName: cards[cardId].name, discussionId: id });
    }
    const result = await createPreparedComment(
      tx,
      id,
      viewerId,
      references,
      cardDiscussionAttachment.policy(),
    );
    // Validation failures must not leave an empty discussion behind.
    if ('error' in result && !binding) await tx.delete(discussion).where(eq(discussion.id, id));
    return result;
  });
}
