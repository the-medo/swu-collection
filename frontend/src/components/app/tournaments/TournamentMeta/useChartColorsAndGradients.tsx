import { SwuAspect, SwuSet } from '../../../../../../types/enums.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCallback } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { isAspect } from '@/lib/cards/isAspect.ts';
import { baseSpecialNameValues } from '../../../../../../shared/lib/basicBases.ts';
import { aspectColors } from '../../../../../../shared/lib/aspectColors.ts';
import { rotationBlocks, setInfo } from '../../../../../../lib/swu-resources/set-info.ts';

const getGradientDef = (id: string, colors: any[]) => ({
  id,
  type: 'linearGradient',
  // gradientTransform: 'rotate(45 0.5 0.5)',
  colors,
});

const getSimpleGradientDef = (id: string, colors: any[]) => ({
  id,
  type: 'linearGradient',
  colors: [...colors].map((a, i) => ({ offset: i * 80, color: a })),
});

export const useChartColorsAndGradients = () => {
  const { data: cardListData } = useCardList();

  return useCallback(
    (value: string | undefined, metaInfo: MetaInfo | 'rotationBlocks') => {
      if (!value || !cardListData || value === 'Others')
        return getGradientDef(value ?? 'unknown', [{ offset: 0, color: '#777777' }]);
      if (value === 'unknown')
        return getGradientDef(value ?? 'unknown', [
          { offset: 0, color: '#cccccc' },
          { offset: 80, color: '#777777' },
        ]);
      const cardList = cardListData.cards;

      let leaderCardId: string | undefined;
      let baseCardId: string | undefined;
      const aspects = new Set<SwuAspect>();

      const processBase = (baseSplit: string) => {
        // special base name - can be either aspect name or in format `Aspect-Force`, for example `Cunning-Force`
        if (baseSpecialNameValues.has(baseSplit)) {
          const specialNameSplitByDash = baseSplit.split('-');
          if (specialNameSplitByDash.length === 1) {
            // dash not found, not a force base
            aspects.add(baseSplit as SwuAspect);
          } else if (specialNameSplitByDash.length === 2) {
            aspects.add(specialNameSplitByDash[0] as SwuAspect);
          }
        } else if (isAspect(baseSplit)) {
          aspects.add(baseSplit as SwuAspect);
        } else {
          baseCardId = baseSplit;
        }
      };

      switch (metaInfo) {
        case 'leaders':
          leaderCardId = value;
          break;
        case 'leadersAndBase': {
          const split = value.split('|');
          leaderCardId = split[0];
          processBase(split[1]);
          break;
        }
        case 'bases':
          processBase(value);
          break;
        case 'aspects':
          aspects.add(value as SwuAspect);
          break;
        case 'aspectsBase':
          aspects.add(value as SwuAspect);
          break;
        case 'aspectsDetailed':
          value.split('-').forEach(s => aspects.add(s as SwuAspect));
          break;
        case 'sets':
          return getSimpleGradientDef(value ?? 'unknown', [setInfo[value as SwuSet]?.hexColor]);
        case 'rotationBlocks':
          return getSimpleGradientDef(value ?? 'unknown', [rotationBlocks[value]?.hexColor]);
      }

      const baseCard = baseCardId ? cardList[baseCardId] : undefined;
      const leaderCard = leaderCardId ? cardList[leaderCardId] : undefined;

      if (baseCard) baseCard.aspects.forEach(a => aspects.add(a));
      if (leaderCard) leaderCard.aspects.forEach(a => aspects.add(a));

      if (aspects.size >= 3) {
        if (aspects.has(SwuAspect.HEROISM)) aspects.delete(SwuAspect.HEROISM);
        if (aspects.has(SwuAspect.VILLAINY)) aspects.delete(SwuAspect.VILLAINY);
      }

      return getGradientDef(
        value ?? 'unknown',
        [...aspects].map((a, i) => ({ offset: i * 80, color: aspectColors[a] })),
      );
    },
    [cardListData],
  );
};
