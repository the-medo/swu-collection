import { cardsBySetAndNumber } from '../db/lists.ts';
import type { SwuSet } from '../../types/enums.ts';
import type { DeckCard } from '../../types/ZDeckCard.ts';

const parseSwudbDeckCard = (cardData: any) => {
  let error: string | false = false;
  const set = cardData.defaultExpansionAbbreviation?.toLowerCase() as SwuSet;
  const cardNo = Number(cardData.defaultCardNumber ?? '');

  const cardId = cardsBySetAndNumber[set]?.[cardNo]?.cardId;
  if (!cardId) {
    error = cardData.cardName ?? `Unknown card - ${set} ${cardNo}`;
  }

  return {
    cardId,
    error,
  };
};

type ParsedSwuDeck = {
  leader1: string | undefined;
  leader2: string | undefined;
  base: string | undefined;
  cards: DeckCard[];
  format: number;
  errors: string[];
};

export const parseSwudbDeck = (deckData: any, swubaseDeckId: string): ParsedSwuDeck => {
  const leader1 = parseSwudbDeckCard(deckData.leader);
  const leader2 = deckData.secondLeader ? parseSwudbDeckCard(deckData.secondLeader) : undefined;
  const base = parseSwudbDeckCard(deckData.base);
  const format = deckData.deckFormat ?? 1;

  const errors: string[] = [];
  if (leader1.error) errors.push(leader1.error);
  if (leader2?.error) errors.push(leader2.error);
  if (base.error) errors.push(base.error);

  const cards: DeckCard[] = [];

  deckData.shuffledDeck.forEach((extendedCardData: any) => {
    const { card, count, sideboardCount } = extendedCardData;
    const parsedCard = parseSwudbDeckCard(card);
    if (parsedCard.error) {
      errors.push(
        `[${count > 0 ? `MD ${count}x - ` : ''}${sideboardCount > 0 ? `SB ${sideboardCount}x - ` : ''} ${parsedCard.error}]`,
      );
    } else {
      if (!parsedCard.cardId) return;
      if (count > 0) {
        cards.push({
          deckId: swubaseDeckId,
          cardId: parsedCard.cardId,
          board: 1,
          note: '',
          quantity: count,
        });
      }
      if (sideboardCount > 0) {
        cards.push({
          deckId: swubaseDeckId,
          cardId: parsedCard.cardId,
          board: 2,
          note: '',
          quantity: sideboardCount,
        });
      }
    }
  });

  console.error(errors);

  return {
    leader1: leader1?.cardId,
    leader2: leader2?.cardId,
    base: base?.cardId,
    format,
    cards,
    errors,
  };
};
