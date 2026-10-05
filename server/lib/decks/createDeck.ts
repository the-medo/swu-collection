import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { deckFolderDeck } from '../../db/schema/deck_folder.ts';
import type { ZDeckCreateRequest } from '../../../types/ZDeck.ts';
import { requireDeckFolderForCreation } from './deckFolders.ts';
import { updateDeckInformation } from './updateDeckInformation.ts';

export async function createDeckForUser(userId: string, input: ZDeckCreateRequest) {
  const { folderId, ...data } = input;
  const created = await db.transaction(async tx => {
    await requireDeckFolderForCreation(tx, userId, folderId);
    const [newDeck] = await tx
      .insert(deck)
      .values({ ...data, userId, description: data.description ?? '' })
      .returning();
    if (!newDeck) throw new Error('Failed to create deck.');
    if (folderId) await tx.insert(deckFolderDeck).values({ deckId: newDeck.id, folderId });
    return newDeck;
  });
  await updateDeckInformation(created.id);
  return created;
}
