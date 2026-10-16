import React from 'react';
import {
  CardGroup,
  ExpandedCardData,
  stackSorter,
} from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import CPCardContentBox from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContentBox.tsx';
import CPCard from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCard.tsx';
import CPMultiCardSelectActions from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPMultiCardSelectActions.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { cn } from '@/lib/utils.ts';
import { useUser } from '@/hooks/useUser.ts';

export interface CPCardContentProps {
  pool?: { cards: ExpandedCardData[]; boxes: CardGroup[] };
  className?: string;
}

const CPCardContent: React.FC<CPCardContentProps> = ({ pool, className }) => {
  const user = useUser();
  const disabled = !user;
  const { data: boxLayout } = useGetUserSetting('cpLayout_boxLayout');
  const { data: imageSize } = useGetUserSetting('cpLayout_imageSize');

  return (
    <div className={`h-full ${className ?? ''}`}>
      {boxLayout === 'spread' ? (
        <>
          {!disabled && !!pool?.cards.length && (
            <div role="group" aria-label="Card pool selection" className="flex justify-end">
              <CPMultiCardSelectActions cards={pool.cards} />
            </div>
          )}
          <div role="list" aria-label="Card pool" className="flex flex-wrap items-start gap-2">
            {/* Use individual copies: aspect groups can contain the same card more than once. */}
            {pool?.cards
              .slice()
              .sort(stackSorter)
              .map(item => (
                <div role="listitem" key={item.cardPoolNumber} className="shrink-0">
                  <CPCard
                    item={item}
                    size={imageSize === 'small' ? 'w100' : 'w200'}
                    disabled={disabled}
                  />
                </div>
              ))}
          </div>
        </>
      ) : (
        <div className={cn('flex flex-1 gap-2', { 'flex-wrap': boxLayout === 'grid' })}>
          {pool?.boxes?.map(group => (
            <CPCardContentBox key={group.title} group={group} disabled={disabled} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CPCardContent;
