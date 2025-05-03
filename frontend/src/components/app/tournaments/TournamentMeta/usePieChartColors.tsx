import { SwuAspect } from '../../../../../../types/enums.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCallback } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { isAspect } from '@/lib/cards/isAspect.ts';

const aspectColors: Record<SwuAspect, string> = {
  [SwuAspect.VIGILANCE]: '#6694ce', // c61 m34 y0 k0
  [SwuAspect.COMMAND]: '#41ad49', // c75 m5 y100 k0
  [SwuAspect.AGGRESSION]: '#d2232a', // c15 m100 y100 k0
  [SwuAspect.CUNNING]: '#fdb933', // c0 m30 y90 k0
  [SwuAspect.HEROISM]: '#c6c1a0', // c18 m14 y36 k6
  [SwuAspect.VILLAINY]: '#040004', // c50 m80 y0 k100
}

const getGradientDef = (id: string, colors: any[]) => ({
  id,
  type: 'linearGradient',
  // gradientTransform: 'rotate(45 0.5 0.5)',
  colors,
});

export const usePieChartColors = () => {
  const { data: cardListData } = useCardList();

  return useCallback((value: string | undefined, metaInfo: MetaInfo,) => {
    if (!value || !cardListData || value === 'Others') return getGradientDef(value ?? 'unknown', [{offset: 0, color: '#777777'}]);
    const cardList = cardListData.cards;

    let leaderCardId: string | undefined;
    let baseCardId: string | undefined;
    const aspects = new Set<SwuAspect>;

    switch (metaInfo) {
      case 'leaders':
        leaderCardId = value;
        break;
      case 'leadersAndBase': {
        const split = value.split('|');
        leaderCardId = split[0];
        if (isAspect(split[1])) {
          aspects.add(split[1] as SwuAspect);
        } else {
          baseCardId = split[1];
        }
        break;
      }
      case 'bases':
        if (isAspect(value)) {
          aspects.add(value as SwuAspect);
        } else {
          baseCardId = value;
        }
        break;
      case 'aspects':
        aspects.add(value as SwuAspect);
        break;
      case 'aspectsBase':
        aspects.add(value as SwuAspect);
        break;
      case 'aspectsDetailed':
        value
          .split('-')
          .forEach(s => aspects.add(s as SwuAspect))
        break;
    }

    const baseCard = baseCardId ? cardList[baseCardId] : undefined;
    const leaderCard = leaderCardId ? cardList[leaderCardId] : undefined;

    if (baseCard) baseCard.aspects.forEach(a => aspects.add(a));
    if (leaderCard) leaderCard.aspects.forEach(a => aspects.add(a));

    if (aspects.size >= 3) {
      if (aspects.has(SwuAspect.HEROISM)) aspects.delete(SwuAspect.HEROISM);
      if (aspects.has(SwuAspect.VILLAINY)) aspects.delete(SwuAspect.VILLAINY);
    }

    return getGradientDef(value ?? 'unknown', [...aspects].map((a, i) => ({offset: i * 80, color: aspectColors[a]})));
  }, [cardListData])
}