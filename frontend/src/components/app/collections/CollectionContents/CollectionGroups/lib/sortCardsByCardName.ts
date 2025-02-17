import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';

export const sortCardsByCardName = (cards: CollectionCard[]): void => {
  cards.sort((a, b) => {
    console.log(a.cardId, b.cardId, a.cardId.localeCompare(b.cardId));
    return a.cardId.localeCompare(b.cardId);
  });
};
