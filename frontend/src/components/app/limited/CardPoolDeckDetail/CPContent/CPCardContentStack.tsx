import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { cn } from '@/lib/utils.ts';
import { ExpandedCardData } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';

export interface CPCardContentStackProps {
  items: ExpandedCardData[];
  size?: 'w200' | 'w100';
}

const CPCardContentStack: React.FC<CPCardContentStackProps> = ({ items, size = 'w200' }) => {
  return (
    <div className="flex-none py-2">
      <ul className={cn('flex flex-col pt-[210px]', size === 'w200' ? 'pt-[210px]' : 'pt-[105px]')}>
        {items.map(item => (
          <li key={`${item.cardPoolNumber}-${item.card.cardId}`} className="list-none">
            <div
              className={cn(
                'relative inline-block align-middle mr-px rounded-[4.75%/3.5%] isolate group cursor-pointer z-1 hover:z-10',
                size === 'w200' ? ' -mt-[210px]' : ' -mt-[105px]',
              )}
            >
              <CardImage
                card={item.card}
                cardVariantId={item.variantId}
                size={size}
                backSideButton={false}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CPCardContentStack;
