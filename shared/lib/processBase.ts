import { baseSpecialNames, baseSpecialNameValues } from './basicBases.ts';
import { SwuAspect } from '../../types/enums.ts';
import { isAspect } from '../../frontend/src/lib/cards/isAspect.ts';
import type { CardList } from '../../lib/swu-resources/types.ts';
import { getBaseShortcut } from '../../frontend/src/lib/cards/getBaseShortcut.ts';

export const processBase = (baseName: string, cardList: CardList | undefined) => {
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
      // dash not found, not a force base
      isBasicBase = true;
      aspects.push(baseSpecialName as SwuAspect);
    } else if (specialNameSplitByDash.length === 2) {
      aspects.push(specialNameSplitByDash[0] as SwuAspect);
      if (specialNameSplitByDash[1] === 'Force') {
        isBasicForceBase = true;
      } else if (specialNameSplitByDash[1] === 'AspectIgnore') {
        isBasicAspectIgnoreBase = true;
      }
    }
  } else if (isAspect(baseName)) {
    isBasicBase = true;
    aspects.push(baseName as SwuAspect);
  } else {
    baseCardId = baseName;
  }

  const baseCard = baseCardId && cardList ? cardList[baseCardId] : undefined;

  if (aspects.length === 0) {
    aspects.push(...(baseCard?.aspects ?? []));
  }

  return {
    aspects,
    baseCard,
    isBasicBase,
    isBasicForceBase,
    isBasicAspectIgnoreBase,
    shortcut: getBaseShortcut(baseCard?.name),
  };
};
