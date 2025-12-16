// Shared helper for sorting price source types with a defined priority

import { CardPriceSourceType } from '../../../types/CardPrices.ts';

const PRICE_SOURCE_SORT_VALUES: Record<string, number | undefined> = {
  [CardPriceSourceType.CARDMARKET]: 1,
  [CardPriceSourceType.TCGPLAYER]: 2,
};

export const getPriceSourceSortValue = (sourceType: string): number =>
  PRICE_SOURCE_SORT_VALUES[sourceType] ?? 10;
