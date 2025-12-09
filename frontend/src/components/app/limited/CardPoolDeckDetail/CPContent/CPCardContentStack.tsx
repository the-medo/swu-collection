import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { ExpandedCardData } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import CPCard from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCard.tsx';
import CPMultiCardSelectActions from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPMultiCardSelectActions.tsx';

export interface CPCardContentStackProps {
  items: ExpandedCardData[];
  size?: 'w200' | 'w100';
  title?: string;
  showTitle?: boolean;
  showBadges?: boolean;
  showMultiSelectActions?: boolean;
  disabled?: boolean;
}

const CPCardContentStack: React.FC<CPCardContentStackProps> = ({
  items,
  size = 'w200',
  title,
  showTitle = false,
  showBadges = true,
  showMultiSelectActions = true,
  disabled = false,
}) => {
  return (
    <div className="flex-none py-2">
      {showMultiSelectActions && !disabled && (
        <CPMultiCardSelectActions cards={items} title={showTitle && title ? title : undefined} />
      )}
      <ul className={cn('flex flex-col pt-[210px]', size === 'w200' ? 'pt-[210px]' : 'pt-[105px]')}>
        {items.map(item => (
          <li key={`${item.cardPoolNumber}-${item.card.cardId}`} className="list-none">
            <div className={cn(size === 'w200' ? ' -mt-[210px]' : ' -mt-[105px]')}>
              <CPCard item={item} size={size} showBadges={showBadges} disabled={disabled} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CPCardContentStack;
