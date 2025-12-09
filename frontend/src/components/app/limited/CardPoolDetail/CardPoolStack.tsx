import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { cn } from '@/lib/utils.ts';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';

export interface CardPoolStackItem {
  card: CardDataWithVariants<CardListVariants>;
  variantId?: string;
  cardPoolNumber: string | number;
}

export interface CardPoolStackProps {
  items: CardPoolStackItem[];
  size?: 'w200' | 'w100';
}

const CardPoolStack: React.FC<CardPoolStackProps> = ({ items, size = 'w200' }) => {
  return (
    <div className="flex-none px-1">
      <ul className={cn('flex flex-col pt-[240px]', size === 'w200' ? 'pt-[220px]' : 'pt-[120px]')}>
        {items.map(item => (
          <li key={`${item.cardPoolNumber}-${item.card.cardId}`} className="list-none">
            <div
              className={cn(
                'relative inline-block align-middle mr-px rounded-[4.75%/3.5%] isolate group cursor-pointer z-1',
                size === 'w200' ? ' -mt-[210px]' : ' -mt-[105px]',
              )}
            >
              <DeckCardHoverImage
                card={item.card}
                defaultVariantId={item.variantId}
                size="w300"
                active={true}
              >
                <div>
                  <CardImage
                    card={item.card}
                    cardVariantId={item.variantId}
                    size={size}
                    backSideButton={false}
                  />
                </div>
              </DeckCardHoverImage>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CardPoolStack;
