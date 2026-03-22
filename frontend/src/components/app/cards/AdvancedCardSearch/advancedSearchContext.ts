import { RangeFilterType } from '@/components/app/global/RangeFilter/RangeFilter.tsx';
import { SwuAspect, SwuArena, SwuRarity, SwuSet } from '../../../../../../types/enums.ts';

export type AdvancedSearchResultsLayout =
  | 'imageBig'
  | 'imageMedium'
  | 'imageSmall'
  | 'tableImage'
  | 'tableSmall';

export type AdvancedSearchSortField = 'name' | 'cardNumber' | 'cost' | 'type' | 'rarity' | 'relevance';
export type AdvancedSearchSortOrder = 'asc' | 'desc';
export type AdvancedSearchStringLookup = Record<string, true>;

export interface AdvancedCardSearchDefaultValues {
  name?: string;
  text?: string;
  sets?: SwuSet[];
  rarities?: SwuRarity[];
  cardTypes?: string[];
  aspects?: SwuAspect[];
  aspectsExact?: boolean;
  includeNoAspect?: boolean;
  arenas?: SwuArena[];
  traits?: string[];
  keywords?: string[];
  variants?: string[];
  cost?: RangeFilterType;
  power?: RangeFilterType;
  hp?: RangeFilterType;
  upgradePower?: RangeFilterType;
  upgradeHp?: RangeFilterType;
  resultsLayout?: AdvancedSearchResultsLayout;
  sortField?: AdvancedSearchSortField;
  sortOrder?: AdvancedSearchSortOrder;
}

export interface AdvancedCardSearchContextConfig {
  availableCardTypes?: AdvancedSearchStringLookup;
  excludedCardTypes?: AdvancedSearchStringLookup;
  defaultValues?: Partial<AdvancedCardSearchDefaultValues>;
}
