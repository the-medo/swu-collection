import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';

export const sortCardsByCardCost = (cardList: CardList, cards: CollectionCard[]): void => {
  const getCardCostByCardId = (cardId: string) => cardList[cardId]?.cost ?? -1;

  cards.sort((a, b) => getCardCostByCardId(a.cardId) - getCardCostByCardId(b.cardId));
};
