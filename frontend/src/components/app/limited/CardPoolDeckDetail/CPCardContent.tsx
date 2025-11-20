import React from 'react';
import { useGetCardPoolDeckCards } from '@/api/card-pools/useGetCardPoolDeckCards.ts';

// Local replica of the expected response type
export type CPDeckCardsResponse = Partial<
  Record<
    number,
    {
      location: 'pool' | 'deck' | 'trash';
      cardId: string;
    }
  >
>;

export interface CPCardContentProps {
  deckId?: string;
  poolId?: string;
  className?: string;
}

const CPCardContent: React.FC<CPCardContentProps> = ({ deckId, poolId, className }) => {
  const { data, isFetching, error } = useGetCardPoolDeckCards(poolId, deckId);

  return (
    <div className={`h-full rounded-lg border border-border bg-card p-3 ${className ?? ''}`}>
      {isFetching && <div className="text-sm opacity-80">Loading deck cards...</div>}
      {!isFetching && !error && (
        <pre className="text-xs whitespace-pre-wrap break-words">
          {JSON.stringify((data as any) ?? null, null, 2)}
        </pre>
      )}
      {!isFetching && error && (
        <div className="text-xs text-destructive">Failed to load deck cards.</div>
      )}
    </div>
  );
};

export default CPCardContent;
