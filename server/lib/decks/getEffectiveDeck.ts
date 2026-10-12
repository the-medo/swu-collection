import type { Deck } from '../../db/schema/deck.ts';
import type { DeckVersion } from '../../db/schema/deck_version.ts';

/** Overlay only saved metadata; identity, visibility and ownership belong to the parent. */
export function getEffectiveDeck(parent: Deck, version?: DeckVersion | null): Deck {
  if (!version?.sealedAt) return parent;
  return {
    ...parent,
    name: version.name ?? parent.name,
    description: version.description ?? '',
    format: version.format ?? parent.format,
    leaderCardId1: version.leaderCardId1,
    leaderCardId2: version.leaderCardId2,
    baseCardId: version.baseCardId,
    updatedAt: version.sourceDeckUpdatedAt ?? version.sealedAt,
  };
}
