import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { buildDeckMetadata } from './metadata.ts';
import { deckDiscussion } from '../../db/schema/deck_discussion.ts';
import { discussionComment } from '../../db/schema/discussion.ts';

/**
 * Updates the deck_information table with aspect counts and other metadata
 * Should be called after deck creation or update
 */
export async function updateDeckInformation(deckId: string) {
  const deckData = (await db.select().from(deck).where(eq(deck.id, deckId)))[0];
  if (!deckData) return;

  const cardList = await getMergedCardList();
  const metadata = buildDeckMetadata(deckData, cardList);

  // Insert or update the deck information
  await db.transaction(async tx => {
    // Discussion writes use this same lock. An initial metadata row must count
    // comments committed before it, and subsequent writes update its counter.
    const existing = await tx
      .select({ id: deck.id })
      .from(deck)
      .where(eq(deck.id, deckId))
      .for('update');
    if (!existing.length) return;
    const [information] = await tx
      .select({ deckId: deckInformation.deckId })
      .from(deckInformation)
      .where(eq(deckInformation.deckId, deckId));
    if (!information) {
      // Account deletion anonymizes comments without taking the discussion lock.
      // SHARE also blocks its non-key update until the initial counter is committed.
      await tx
        .select({ id: discussionComment.id })
        .from(discussionComment)
        .innerJoin(deckDiscussion, eq(deckDiscussion.discussionId, discussionComment.discussionId))
        .where(eq(deckDiscussion.deckId, deckId))
        .for('share', { of: discussionComment });
    }
    await tx
      .insert(deckInformation)
      .values({
        deckId: deckData.id,
        ...metadata,
        favoritesCount: 0,
        commentsCount: sql<number>`(SELECT count(*)::integer FROM ${discussionComment} JOIN ${deckDiscussion} ON ${deckDiscussion.discussionId} = ${discussionComment.discussionId} WHERE ${deckDiscussion.deckId} = ${deckData.id} AND ${discussionComment.deletedAt} IS NULL)`,
        score: 0,
      })
      .onConflictDoUpdate({
        target: [deckInformation.deckId],
        set: {
          ...metadata,
          // Don't update counts here to avoid resetting them
        },
      });
  });
}
