import React from 'react';

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
  loading: boolean;
  deckError?: unknown;
  error?: unknown;
  data?: CPDeckCardsResponse;
  className?: string;
}

const CPCardContent: React.FC<CPCardContentProps> = ({
  loading,
  deckError,
  error,
  data,
  className,
}) => {
  return (
    <div className={`h-full rounded-lg border border-border bg-card p-3 ${className ?? ''}`}>
      {loading && <div className="text-sm opacity-80">Loading deck cards...</div>}
      {!loading && !deckError && !error && (
        <pre className="text-xs whitespace-pre-wrap break-words">
          {JSON.stringify(data ?? null, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default CPCardContent;
