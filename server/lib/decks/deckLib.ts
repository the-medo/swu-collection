import type { SwuSet } from '../../../types/enums.ts';
import type { DeckCard } from '../../../types/ZDeckCard.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { transformToId } from '../../../lib/swu-resources/lib/transformToId.ts';

type CardsBySetAndNumber = Partial<Record<SwuSet, Record<number, { cardId: string }>>>;

const validVariantNames: Record<string, true | undefined> = {
  Standard: true,
  Hyperspace: true,
  'Standard Foil': true,
  'Hyperspace Foil': true,
  Showcase: true,
};

const buildCardsBySetAndNumber = (cardList: CardList) => {
  const cardsBySetAndNumber: CardsBySetAndNumber = {};

  Object.entries(cardList).forEach(([cardId, card]) => {
    if (!card) return;

    Object.values(card.variants ?? {}).forEach(variant => {
      if (!variant || !validVariantNames[variant.variantName]) return;
      if (variant.cardNo <= 0) return;
      if (!card.preview && !variant.baseSet) return;

      if (!cardsBySetAndNumber[variant.set]) cardsBySetAndNumber[variant.set] = {};
      cardsBySetAndNumber[variant.set]![variant.cardNo] = { cardId };
    });
  });

  return cardsBySetAndNumber;
};

const parseSwudbDeckCard = (cardData: any, cardList: CardList, index: CardsBySetAndNumber) => {
  let error: string | false = false;
  const set = cardData.defaultExpansionAbbreviation?.toLowerCase() as SwuSet;
  const cardNo = Number(cardData.defaultCardNumber ?? '');

  const swudbCardName = typeof cardData.cardName === 'string' ? cardData.cardName : undefined;
  const transformedCardName = swudbCardName ? transformToId(swudbCardName) : undefined;
  const cardId =
    index[set]?.[cardNo]?.cardId ??
    (transformedCardName && cardList[transformedCardName] ? transformedCardName : undefined);

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

export const parseSwudbDeck = (
  deckData: any,
  swubaseDeckId: string,
  cardList: CardList,
): ParsedSwuDeck => {
  const index = buildCardsBySetAndNumber(cardList);
  const parseCard = (cardData: any) => parseSwudbDeckCard(cardData, cardList, index);

  const leader1 = parseCard(deckData.leader);
  const leader2 = deckData.secondLeader ? parseCard(deckData.secondLeader) : undefined;
  const base = parseCard(deckData.base);
  const format = deckData.deckFormat ?? 1;

  const errors: string[] = [];
  if (leader1.error) errors.push(leader1.error);
  if (leader2?.error) errors.push(leader2.error);
  if (base.error) errors.push(base.error);

  const cards: DeckCard[] = [];

  deckData.shuffledDeck.forEach((extendedCardData: any) => {
    const { card, count, sideboardCount } = extendedCardData;
    const parsedCard = parseCard(card);
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

  return {
    leader1: leader1?.cardId,
    leader2: leader2?.cardId,
    base: base?.cardId,
    format,
    cards,
    errors,
  };
};
