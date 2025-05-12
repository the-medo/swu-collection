import { CardStatExtended } from '@/api/card-stats/useCardStats.ts';
import { CardDataWithVariants, CardListVariants } from '../../../../../lib/swu-resources/types.ts';

export type CardStatData = {
  card: CardDataWithVariants<CardListVariants> | undefined;
  cardStat: CardStatExtended;
};
