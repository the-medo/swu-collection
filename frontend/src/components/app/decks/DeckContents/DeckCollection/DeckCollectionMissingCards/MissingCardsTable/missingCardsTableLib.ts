import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../../../lib/swu-resources/types.ts';

export interface CardOwnedQuantity {
  deckCollection: number;
  wantlist: number;
  nonDeckCollection: number;
  cardlist: number;
}

export interface MissingCardsRowData {
  cardId: string;
  card: CardDataWithVariants<CardListVariants> | undefined;
  quantity: number;
  ownedQuantity: CardOwnedQuantity | undefined;
}
