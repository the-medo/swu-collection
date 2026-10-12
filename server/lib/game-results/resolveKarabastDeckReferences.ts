import { getEffectiveDeck } from '../decks/getEffectiveDeck.ts';
import type { IntegrationGameData } from '../../db/schema/integration.ts';
import type { DeckCard } from '../../../types/ZDeckCard.ts';
import { normalizeKarabastDeckId, type IntegrationGameDataContent } from './karabastGameData.ts';
import { resolveDeckReference } from '../decks/resolveDeckReference.ts';
import { getDeckVersionId } from '../decks/getDeckVersionId.ts';
import { DeckVersionError } from '../decks/deckVersionErrors.ts';

export type KarabastResolvedDeckReference = {
  deckId: string;
  deckVersionId: string | null;
  decklist: DeckCard[];
  deckInfo: {
    name: string;
    cardPoolId: string | null;
    formatId: number;
  };
};

export type KarabastResolvedDeckReferences = Record<number, KarabastResolvedDeckReference | null>;

export async function resolveKarabastDeckReferences(
  integrationData: IntegrationGameData,
): Promise<KarabastResolvedDeckReferences> {
  const data = integrationData.data as IntegrationGameDataContent;
  const resolved: KarabastResolvedDeckReferences = {};

  for (let index = 0; index < Math.min(data.players?.length ?? 0, 2); index++) {
    const rawId = normalizeKarabastDeckId(data.players?.[index]?.data?.deck?.id);
    if (!rawId) {
      resolved[index] = null;
      continue;
    }
    const reference = await resolveDeckReference(rawId);
    if (!reference) {
      resolved[index] = null;
      continue;
    }

    try {
      const version = await getDeckVersionId({
        deckId: reference.deck.id,
        deckVersionId: reference.version?.id ?? null,
      });
      const effectiveDeck = getEffectiveDeck(reference.deck, reference.version);
      resolved[index] = {
        ...version,
        deckInfo: {
          name: effectiveDeck.name,
          cardPoolId: reference.deck.cardPoolId,
          formatId: effectiveDeck.format,
        },
      };
    } catch (error) {
      if (error instanceof DeckVersionError && error.code === 'LIMITED_DECK_UNSUPPORTED') {
        resolved[index] = {
          deckId: reference.deck.id,
          deckVersionId: null,
          decklist: [],
          deckInfo: {
            name: reference.deck.name,
            cardPoolId: reference.deck.cardPoolId,
            formatId: reference.deck.format,
          },
        };
        continue;
      }
      throw error;
    }
  }

  return resolved;
}
