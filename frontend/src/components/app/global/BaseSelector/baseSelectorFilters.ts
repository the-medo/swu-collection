import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import type { HomeworldBaseTrait } from '../../../../../../shared/lib/basicBases.ts';
import { getHomeworldBaseTrait } from '../../../../../../shared/lib/basicBases.ts';

type FilterableBase = Pick<
  CardDataWithVariants<CardListVariants>,
  'cardId' | 'hp' | 'name' | 'text' | 'traits'
>;

export const matchesBaseTraitFilter = (
  base: FilterableBase | undefined,
  traitFilter: HomeworldBaseTrait | undefined,
): boolean => {
  if (!traitFilter) return true;
  const normalizedTrait = traitFilter.toLowerCase();

  return Boolean(
    base?.traits.some(trait => trait.toLowerCase() === normalizedTrait) ||
      getHomeworldBaseTrait(base?.cardId) === traitFilter,
  );
};

export const matchesBaseSearch = (base: FilterableBase | undefined, search: string): boolean => {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const matchesText = [
    base?.name,
    base?.text,
    ...(base?.traits ?? []),
    getHomeworldBaseTrait(base?.cardId),
  ].some(value => value?.toLowerCase().includes(normalizedSearch));
  if (matchesText) return true;

  return /^\d+$/.test(normalizedSearch) && base?.hp === Number(normalizedSearch);
};
