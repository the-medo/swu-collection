import { isBasicBase } from '@/lib/cards/isBasicBase.ts';

// Helper function to get base key
export const getBaseKey = (
  baseCardId: string | undefined | null,
  baseAspect: string | undefined | null,
  cardListData: any
): string => {
  const baseCard = baseCardId ? cardListData?.cards[baseCardId] : undefined;
  return (isBasicBase(baseCard) ? baseAspect : baseCardId) ?? '';
};