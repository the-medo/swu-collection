import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { collection } from '../../db/schema/collection.ts';
import { collectionCard } from '../../db/schema/collection_card.ts';
import { collectionImport, collectionImportRow } from '../../db/schema/collection_import.ts';
import { collectionImportMatchKey } from '../../../types/CollectionImport.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { updateCollectionUpdatedAt } from '../updateCollectionUpdatedAt.ts';
import { CollectionImportError } from './importCollectionCsv.ts';

type ReviewAction = { completed: boolean } | { count: number };

/** Collection lock serializes group saves and makes retries safe across source rows. */
export async function reviewCollectionImport(
  userId: string,
  collectionId: string,
  importId: string,
  rowId: string,
  action: ReviewAction,
) {
  return db.transaction(async tx => {
    const [owned] = await tx
      .select({ id: collection.id })
      .from(collection)
      .where(and(eq(collection.id, collectionId), eq(collection.userId, userId)))
      .for('update');
    if (!owned) throw new CollectionImportError(404, 'Import row not found.');
    const [report] = await tx
      .select({ id: collectionImport.id })
      .from(collectionImport)
      .where(
        and(eq(collectionImport.id, importId), eq(collectionImport.collectionId, collectionId)),
      );
    if (!report) throw new CollectionImportError(404, 'Import row not found.');
    const [anchor] = await tx
      .select()
      .from(collectionImportRow)
      .where(and(eq(collectionImportRow.id, rowId), eq(collectionImportRow.importId, importId)));
    if (!anchor) throw new CollectionImportError(404, 'Import row not found.');
    let group = [anchor];
    if (anchor.problem === 'duplicate' && anchor.match) {
      const candidates = await tx
        .select()
        .from(collectionImportRow)
        .where(
          and(
            eq(collectionImportRow.importId, importId),
            eq(collectionImportRow.problem, 'duplicate'),
          ),
        );
      const key = collectionImportMatchKey(anchor.match);
      group = candidates.filter(row => row.match && collectionImportMatchKey(row.match) === key);
    }
    const toResponse = (rows: typeof group) => ({
      rows: rows.map(row => ({
        id: row.id,
        completedAt: row.completedAt?.toISOString() ?? null,
        resolvedCount: row.resolvedCount,
      })),
    });
    let changes: { completedAt: Date | null; resolvedCount?: number };
    if ('count' in action) {
      if (anchor.problem !== 'duplicate' || !anchor.match || group.length < 2)
        throw new CollectionImportError(409, 'This row is not part of a matched duplicate group.');
      if (group.some(row => row.resolvedCount !== null)) {
        if (group.every(row => row.resolvedCount === action.count)) return toResponse(group);
        throw new CollectionImportError(
          409,
          'This group has already been saved. Adjust its cards in the collection.',
        );
      }
      const { cardId, variantId, isFoil } = anchor.match;
      if (action.count > 0) {
        const catalog = await getMergedCardList();
        if (!catalog[cardId]?.variants[variantId])
          throw new CollectionImportError(
            409,
            'This printing is no longer available. Add the correct card manually.',
          );
        await tx
          .insert(collectionCard)
          .values({
            collectionId,
            cardId,
            variantId,
            foil: isFoil,
            condition: 1,
            language: 'EN',
            amount: action.count,
          })
          .onConflictDoUpdate({
            target: [
              collectionCard.collectionId,
              collectionCard.cardId,
              collectionCard.variantId,
              collectionCard.foil,
              collectionCard.condition,
              collectionCard.language,
            ],
            set: { amount: sql`${collectionCard.amount} + EXCLUDED.amount` },
          });
        await updateCollectionUpdatedAt(collectionId, tx);
      }
      changes = { completedAt: new Date(), resolvedCount: action.count };
    } else {
      changes = { completedAt: action.completed ? new Date() : null };
    }
    const updated = await tx
      .update(collectionImportRow)
      .set(changes)
      .where(
        inArray(
          collectionImportRow.id,
          group.map(row => row.id),
        ),
      )
      .returning();
    return toResponse(updated);
  });
}
