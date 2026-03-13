import { useCardList } from '@/api/lists/useCardList.ts';
import { useCallback } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { SwuAspect, SwuSet } from '../../../../../../types/enums.ts';
import { aspectSortValues } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { IconVariantProps } from '@/components/app/global/icons/iconLib.ts';
import CardImage, { CardImageVariantProps } from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import SetIcon from '@/components/app/global/icons/SetIcon.tsx';
import { processBase, ProcessedBase } from '../../../../../../shared/lib/processBase.ts';
import SpecialBaseIcon from '@/components/app/global/icons/SpecialBaseIcon.tsx';

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
      let processedBase: ProcessedBase | undefined = undefined;
      let aspectIconSize: IconVariantProps['size'] = 'xSmall';
      let aspects: SwuAspect[] = [];

      switch (metaInfo) {
        case 'leaders':
          leaderCardId = value;
          break;
        case 'leadersAndBase':
          const split = value.split('|');
          leaderCardId = split[0];
          processedBase = processBase(split[1], cardList);
          break;
        case 'bases':
          processedBase = processBase(value, cardList);
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

      if (processedBase?.baseCardId && type !== 'text') {
        aspects.push(...(cardList[processedBase?.baseCardId]?.aspects ?? []));
      }

      const baseCard = processedBase?.baseCardId ? cardList[processedBase?.baseCardId] : undefined;
      const leaderCard = leaderCardId ? cardList[leaderCardId] : undefined;
      const defaultVariant = leaderCard ? selectDefaultVariant(leaderCard) : undefined;
      const leaderSet = defaultVariant ? leaderCard?.variants[defaultVariant]?.set : undefined;

      if (type === 'text') {
        if (metaInfo === 'sets') {
          return setInfo[value as SwuSet]?.name;
        }
        return `${leaderCardId ? cardList[leaderCardId]?.title : ''} ${leaderSet ? `(${leaderSet?.toUpperCase()})` : ''} ${processedBase?.baseCardId ? cardList[processedBase?.baseCardId]?.name : ''}${aspects.length ? ` ${aspects.join(', ')}` : ''}${processedBase?.isBasicForceBase ? '-Force' : ''}`;
      } else if (type === 'compact') {
        if (metaInfo === 'sets') {
          return <span className="min-w-[150px]">{setInfo[value as SwuSet]?.name}</span>;
        }
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
              {baseCard && !processedBase?.isAnyBasicBase && metaInfo !== 'leadersAndBase' && (
                <span>{baseCard.name}</span>
              )}

              {aspects.map(a => (
                <AspectIcon aspect={a} size={aspectIconSize} />
              ))}
              {metaInfo === 'leadersAndBase' ? (
                <span className="w-[20px]">
                  {processedBase?.shortcut}
                  {processedBase && (
                    <SpecialBaseIcon processedBase={processedBase} size={aspectIconSize} />
                  )}
                </span>
              ) : (
                <>
                  {processedBase && (
                    <SpecialBaseIcon processedBase={processedBase} size={aspectIconSize} />
                  )}
                </>
              )}
            </div>
          </div>
        );
      } else if (type === 'image' || type === 'image-small') {
        if (metaInfo === 'sets') {
          return (
            <div className="flex flex-row gap-2 items-center">
              <SetIcon set={value} />
            </div>
          );
        }
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
            {processedBase?.baseCardId && (
              <CardImage
                size={size}
                forceHorizontal={true}
                card={cardList[processedBase?.baseCardId]}
                cardVariantId={baseCard ? selectDefaultVariant(baseCard) : undefined}
              />
            )}
            {!processedBase?.baseCardId && aspects.map(a => <AspectIcon key={a} aspect={a} />)}
            {processedBase?.isBasicForceBase && <AspectIcon aspect="force" />}
          </div>
        );
      }

      return null;
    },
    [cardListData],
  );
}
