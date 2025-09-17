export interface CardOwnedQuantity {
  deckCollection: number;
  wantlist: number;
  nonDeckCollection: number;
  cardlist: number;
}

interface MissingCardsRowData {
  cardId: string;
  quantity: number;
  ownedQuantity: CardOwnedQuantity;
}
