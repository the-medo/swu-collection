import React from 'react';
import {
  CardGroup,
  ExpandedCardData,
} from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import CPCardContentBox from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContentBox.tsx';

export interface CPCardContentProps {
  pool?: { cards: ExpandedCardData[]; boxes: CardGroup[] };
  className?: string;
}

const CPCardContent: React.FC<CPCardContentProps> = ({ pool, className }) => {
  return (
    <div className={`h-full ${className ?? ''}`}>
      <div className="flex gap-2 flex-wrap">
        {pool?.boxes?.map(group => (
          <CPCardContentBox key={group.title} group={group} />
        ))}
      </div>
    </div>
  );
};

export default CPCardContent;
