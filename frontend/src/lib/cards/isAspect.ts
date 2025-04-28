import { aspectSortValues } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';

export const isAspect = (v: string | undefined) => {
  if (!v) return false;
  return !!aspectSortValues[v];
};
