import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { deckArticle } from '../../db/schema/deck_discussion.ts';
import { deckReadAccess } from './deckFolderAccess.ts';
import type { PostDocument } from '../../../shared/posts/content.ts';
import type { DeckArticle } from '../../../shared/types/deck-discussion.ts';
import type { DiscussionResult as Result } from '../discussions/policy.ts';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const unavailable = {
  error: 'This deck is unavailable, or you do not have access to it.',
  status: 404 as const,
};
const conflict = {
  error: 'This was changed in another tab. Your draft is still here; choose which version to keep.',
  status: 409 as const,
};
// Serialize discussion writes with deck edits/deletion and protect comment counts.
async function lockReadableDeck(tx: Transaction, deckId: string, viewerId: string) {
  const [data] = await tx
    .select({ id: deck.id, userId: deck.userId })
    .from(deck)
    .where(and(eq(deck.id, deckId), deckReadAccess(viewerId)))
    .for('update');
  return data;
}

export async function getDeckArticle(
  deckId: string,
  viewerId?: string,
): Promise<Result<DeckArticle | null>> {
  const [data] = await db
    .select({ article: getTableColumns(deckArticle) })
    .from(deck)
    .leftJoin(deckArticle, eq(deckArticle.deckId, deck.id))
    .where(and(eq(deck.id, deckId), deckReadAccess(viewerId)));
  return data ? { data: data.article } : unavailable;
}

export async function saveDeckArticle(
  deckId: string,
  viewerId: string,
  content: PostDocument,
  revision: number | null,
): Promise<Result<DeckArticle>> {
  return db.transaction(async tx => {
    const current = await lockReadableDeck(tx, deckId, viewerId);
    if (!current) return unavailable;
    if (current.userId !== viewerId)
      return { error: 'Only the deck owner can edit its guide.', status: 403 };
    const [saved] =
      revision === null
        ? await tx.insert(deckArticle).values({ deckId, content }).onConflictDoNothing().returning()
        : await tx
            .update(deckArticle)
            .set({ content, revision: sql`${deckArticle.revision} + 1`, updatedAt: sql`now()` })
            .where(
              and(
                eq(deckArticle.deckId, deckId),
                eq(deckArticle.revision, revision),
                sql`EXISTS (SELECT 1 FROM deck WHERE deck.id = ${deckArticle.deckId} AND deck.user_id = ${viewerId})`,
              ),
            )
            .returning();
    if (!saved) return conflict;
    await tx
      .update(deck)
      .set({ updatedAt: sql`now()` })
      .where(and(eq(deck.id, deckId), eq(deck.userId, viewerId)));
    return { data: saved };
  });
}
