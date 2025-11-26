import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { cn } from '@/lib/utils.ts';
import { ExpandedCardData } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { Check, X } from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';

export interface CPCardProps {
  item: ExpandedCardData;
  size?: 'w200' | 'w100';
}

const CPCard: React.FC<CPCardProps> = ({ item, size = 'w200' }) => {
  const { selectedCardIds, showCardsInDeck, showRemovedCards, showUnfilteredCards } =
    useCardPoolDeckDetailStore();
  const { setHoveredCardId, toggleSelectedCardId } = useCardPoolDeckDetailStoreActions();

  const selected = !!selectedCardIds[item.cardPoolNumber];

  const showDeckBadge = showCardsInDeck && item.location === 'deck';
  const showTrashBadge = showRemovedCards && item.location === 'trash';
  const failedFilter = showUnfilteredCards && !item.filterSuccess;
  const { data: cardPreview } = useGetUserSetting('cpLayout_cardPreview');

  const cardNode = (
    <div
      onMouseEnter={() => setHoveredCardId(item.cardId)}
      onClick={() => toggleSelectedCardId(item.cardPoolNumber)}
      className={cn(
        'relative inline-block align-middle mr-px rounded-[4.75%/3.5%] isolate group cursor-pointer bg-background',
        selected ? ' border-inset text-gray-300' : '',
      )}
    >
      <div
        className={cn('transition-opacity opacity-100', {
          'opacity-40': showTrashBadge,
          'opacity-80': showDeckBadge,
          'opacity-50': failedFilter,
        })}
      >
        <CardImage
          card={item.card}
          cardVariantId={item.variantId}
          size={size}
          backSideButton={false}
        />
        {selected && (
          <div className="absolute rounded-md top-0 left-0 border-1 border-black ring-8 ring-inset ring-primary w-full h-full"></div>
        )}
      </div>

      {/* Badges */}
      {selected && (
        <div
          className={cn(
            'absolute top-1 right-1 z-10 rounded-full border-1 border-black bg-yellow-400 text-black p-1 shadow',
            {
              'right-8': showDeckBadge || showTrashBadge,
            },
          )}
        >
          <Check className="h-4 w-4" />
        </div>
      )}
      {showDeckBadge && (
        <div className="absolute top-1 right-1 z-10 rounded-full border-1 border-black bg-emerald-500 text-white p-1 shadow">
          <Check className="h-4 w-4" />
        </div>
      )}
      {showTrashBadge && (
        <div className="absolute top-1 right-1 z-10 rounded-full border-1 border-black bg-red-500 text-white p-1 shadow">
          <X className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  return (
    <DeckCardHoverImage card={item.card} size={'w300'} active={cardPreview === 'hover'}>
      {cardNode}
    </DeckCardHoverImage>
  );
};

export default CPCard;
