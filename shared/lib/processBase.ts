import {
  baseSpecialNames,
  baseSpecialNameValues,
  basicAspectIgnoreBaseForAspect,
  basicBaseForAspect,
  basicForceBaseForAspect,
} from './basicBases.ts';
import { SwuAspect } from '../../types/enums.ts';
import { isAspect } from '../../frontend/src/lib/cards/isAspect.ts';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
} from '../../lib/swu-resources/types.ts';
import { getBaseShortcut } from '../../frontend/src/lib/cards/getBaseShortcut.ts';

export type ProcessedBase = {
  aspects: SwuAspect[];
  baseCard: CardDataWithVariants<CardListVariants> | undefined;
  baseCardId: string | undefined;
  shortcut: string | undefined;
  isAnyBasicBase: boolean;
  isBasicBase: boolean;
  isBasicForceBase: boolean;
  isBasicAspectIgnoreBase: boolean;
};

export const processBase = (baseName: string, cardList: CardList | undefined): ProcessedBase => {
  let baseCardId: string | undefined;
  let aspects: SwuAspect[] = [];
  let isBasicBase = false;
  let isBasicForceBase = false;
  let isBasicAspectIgnoreBase = false;
  const baseSpecialName = baseSpecialNameValues.has(baseName)
    ? baseName
    : baseSpecialNames[baseName];

  // special base name - can be either aspect name or in format `Aspect-Force`, for example `Cunning-Force`
  if (baseSpecialName) {
    const specialNameSplitByDash = baseSpecialName.split('-');
    if (specialNameSplitByDash.length === 1) {
      // dash not found, not a force/aspect-ignore base
      isBasicBase = true;
      aspects.push(baseSpecialName as SwuAspect);
      baseCardId = basicBaseForAspect[baseName];
    } else if (specialNameSplitByDash.length === 2) {
      aspects.push(specialNameSplitByDash[0] as SwuAspect);
      if (specialNameSplitByDash[1] === 'Force') {
        isBasicForceBase = true;
        baseCardId = basicForceBaseForAspect[baseName];
      } else if (specialNameSplitByDash[1] === 'AspectIgnore') {
        isBasicAspectIgnoreBase = true;
        baseCardId = basicAspectIgnoreBaseForAspect[baseName];
      }
    }
  } else if (isAspect(baseName)) {
    isBasicBase = true;
    aspects.push(baseName as SwuAspect);
    baseCardId = basicBaseForAspect[baseName];
  } else {
    baseCardId = baseName;
  }

  const baseCard = baseCardId && cardList ? cardList[baseCardId] : undefined;

  if (aspects.length === 0) {
    aspects.push(...(baseCard?.aspects ?? []));
  }

  const isAnyBasicBase = isBasicBase || isBasicForceBase || isBasicAspectIgnoreBase;

  return {
    aspects,
    baseCard,
    baseCardId,
    isAnyBasicBase,
    isBasicBase,
    isBasicForceBase,
    isBasicAspectIgnoreBase,
    shortcut: isAnyBasicBase ? '' : getBaseShortcut(baseCard?.name),
  };
};
