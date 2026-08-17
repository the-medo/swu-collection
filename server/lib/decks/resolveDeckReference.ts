import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { deck as deckTable, type Deck } from '../../db/schema/deck.ts';
import { deckVersion as deckVersionTable, type DeckVersion } from '../../db/schema/deck_version.ts';
import type { DeckReference } from '../../../types/Deck.ts';

export type ResolvedDeckReference = {
  deck: Deck;
  version: DeckVersion | null;
  reference: DeckReference;
};

export async function resolveDeckReference(
  referenceId: string,
): Promise<ResolvedDeckReference | null> {
  const parent = (
    await db.select().from(deckTable).where(eq(deckTable.id, referenceId)).limit(1)
  )[0];
  if (parent) {
    return {
      deck: parent,
      version: null,
      reference: {
        id: referenceId,
        deckId: parent.id,
        deckVersionId: null,
        versionNumber: null,
        kind: 'parent',
        latestVersionNumber: parent.versionCount,
      },
    };
  }

  const row = (
    await db
      .select({ deck: deckTable, version: deckVersionTable })
      .from(deckVersionTable)
      .innerJoin(deckTable, eq(deckVersionTable.deckId, deckTable.id))
      .where(eq(deckVersionTable.id, referenceId))
      .limit(1)
  )[0];
  if (!row) return null;

  return {
    ...row,
    reference: {
      id: referenceId,
      deckId: row.deck.id,
      deckVersionId: row.version.id,
      versionNumber: row.version.versionNumber,
      kind: row.version.sealedAt ? 'sealed-version' : 'open-version',
      latestVersionNumber: row.deck.versionCount,
    },
  };
}
