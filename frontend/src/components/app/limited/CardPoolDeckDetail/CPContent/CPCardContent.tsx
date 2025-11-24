import React from 'react';
import { CardGroup, ExpandedCardData } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';

export interface CPCardContentProps {
  pool?: { cards: ExpandedCardData[]; boxes: CardGroup[] };
  className?: string;
}

const CPCardContent: React.FC<CPCardContentProps> = ({ pool, className }) => {
  return (
    <div className={`h-full rounded-lg border border-border bg-card p-3 ${className ?? ''}`}>
      <pre className="text-xs whitespace-pre-wrap break-words">
        {pool?.cards.map(c => `${c.cardId} (${c.location})`).join('\n') ?? ''}
      </pre>
    </div>
  );
};

export default CPCardContent;
