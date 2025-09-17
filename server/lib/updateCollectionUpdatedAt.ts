import { db } from '../db';
import { collection as collectionTable } from '../db/schema/collection.ts';
import { eq } from 'drizzle-orm';

/**
 * Updates the `updatedAt` column of a collection to the current time.
 * Safe to call after mutations to mark the collection as changed.
 */
export async function updateCollectionUpdatedAt(collectionId: string): Promise<void> {
  if (!collectionId) return;
  try {
    await db
      .update(collectionTable)
      .set({ updatedAt: new Date() })
      .where(eq(collectionTable.id, collectionId));
  } catch (e) {
    // Swallow to avoid failing the main operation due to timestamp update issues.
    console.error('Failed to update collection.updatedAt', { collectionId, error: e });
  }
}
