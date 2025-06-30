import { useCardList } from '@/api/lists/useCardList.ts';
import { useCallback } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { aspectSortValues } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { IconVariantProps } from '@/components/app/global/icons/iconLib.ts';
import CardImage, { CardImageVariantProps } from '@/components/app/global/CardImage.tsx';
import { isAspect } from '@/lib/cards/isAspect.ts';
import { getBaseShortcut } from '@/lib/cards/getBaseShortcut.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';

export type DeckKeyLabelType = 'text' | 'compact' | 'image' | 'image-small';

export function useLabel() {
  const { data: cardListData } = useCardList();

  return useCallback(
    (
      value: string | undefined,
      metaInfo: MetaInfo,
      type: DeckKeyLabelType,
      align: 'left' | 'right' = 'left',
    ) => {
      if (!value) return value;
      if (!cardListData) return value;
      if (value === 'Others') return 'Others';
      if (value === 'unknown') return 'Unknown';
      const cardList = cardListData.cards;

      let leaderCardId: string | undefined;
      let baseCardId: string | undefined;
      let aspects: SwuAspect[] = [];
      let aspectIconSize: IconVariantProps['size'] = 'xSmall';

      switch (metaInfo) {
        case 'leaders':
          leaderCardId = value;
          break;
        case 'leadersAndBase':
          const split = value.split('|');
          leaderCardId = split[0];
          if (isAspect(split[1])) {
            aspects.push(split[1] as SwuAspect);
          } else {
            baseCardId = split[1];
          }
          break;
        case 'bases':
          if (isAspect(value)) {
            aspects.push(value as SwuAspect);
          } else {
            baseCardId = value;
          }
          break;
        case 'aspects':
          aspects.push(value as SwuAspect);
          aspectIconSize = 'medium';
          break;
        case 'aspectsBase':
          aspects.push(value as SwuAspect);
          aspectIconSize = 'medium';
          break;
        case 'aspectsDetailed':
          aspects = value
            .split('-')
            .map(s => s as SwuAspect)
            .sort((a, b) => aspectSortValues[a] - aspectSortValues[b]);
          break;
      }

      if (baseCardId && type !== 'text') {
        aspects.push(...(cardList[baseCardId]?.aspects ?? []));
      }

      const baseCard = baseCardId ? cardList[baseCardId] : undefined;
      const leaderCard = leaderCardId ? cardList[leaderCardId] : undefined;
      const defaultVariant = leaderCard ? selectDefaultVariant(leaderCard) : undefined;
      const leaderSet = defaultVariant ? leaderCard?.variants[defaultVariant]?.set : undefined;

      if (type === 'text') {
        return `${leaderCardId ? cardList[leaderCardId]?.title : ''} ${leaderSet ? `(${leaderSet?.toUpperCase()})` : ''} ${baseCardId ? cardList[baseCardId]?.name : ''}${aspects.length ? ` ${aspects.join(', ')}` : ''}`;
      } else if (type === 'compact') {
        return (
          <div
            className={cn('flex flex-row gap-2 items-center', {
              'justify-end': metaInfo === 'leadersAndBase' && align === 'right',
              'justify-between': metaInfo === 'leadersAndBase' && align === 'left',
            })}
          >
            {leaderCardId && (
              <div className="flex flex-row gap-2 items-center">
                <span>{cardList[leaderCardId]?.title}</span>
                {leaderSet && (
                  <span className="w-[25px] text-[10px]">({leaderSet.toUpperCase()})</span>
                )}
              </div>
            )}
            <div className="flex flex-row gap-2 items-center">
              {baseCard && metaInfo !== 'leadersAndBase' && <span>{baseCard.name}</span>}
              {aspects.map(a => (
                <AspectIcon aspect={a} size={aspectIconSize} />
              ))}
              {metaInfo === 'leadersAndBase' && (
                <span className="w-[20px]">{getBaseShortcut(baseCard?.name)}</span>
              )}
            </div>
          </div>
        );
      } else if (type === 'image' || type === 'image-small') {
        const size: CardImageVariantProps['size'] = type === 'image' ? 'w200' : 'w75';
        return (
          <div className="flex flex-row gap-2 items-center">
            {leaderCardId && (
              <CardImage
                size={size}
                forceHorizontal={true}
                card={cardList[leaderCardId]}
                cardVariantId={leaderCard ? selectDefaultVariant(leaderCard) : undefined}
                backSideButton={false}
              />
            )}
            {baseCardId && (
              <CardImage
                size={size}
                forceHorizontal={true}
                card={cardList[baseCardId]}
                cardVariantId={baseCard ? selectDefaultVariant(baseCard) : undefined}
              />
            )}
            {!baseCardId && aspects.map(a => <AspectIcon key={a} aspect={a} />)}
          </div>
        );
      }

      return null;
    },
    [cardListData],
  );
}
