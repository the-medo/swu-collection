import { CardCondition, type CardLanguage } from './enums.ts';

export interface CollectionCard {
  cardId: string;
  variantId: string;
  foil: boolean;
  condition: CardCondition;
  language: CardLanguage;
  note: string;
  amount: number;
  amount2?: number;
  price?: number;
}
