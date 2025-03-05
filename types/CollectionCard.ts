import { CardLanguage } from './enums.ts';

export interface CollectionCard {
  cardId: string;
  variantId: string;
  foil: boolean;
  condition: number;
  language: CardLanguage;
  note: string;
  amount: number;
  amount2?: number;
  price?: number;
}

export const createFakeCollectionCard = (cardId: string, variantId: string): CollectionCard => ({
  cardId,
  variantId,
  foil: false,
  condition: 1,
  language: CardLanguage.EN,
  note: '',
  amount: 1,
});
