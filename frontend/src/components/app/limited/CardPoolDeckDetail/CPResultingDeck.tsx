import React from 'react';

export interface CPResultingDeckProps {
  className?: string;
}

const CPResultingDeck: React.FC<CPResultingDeckProps> = ({ className }) => {
  return (
    <div className={`h-full rounded-lg border border-border bg-card p-3 text-xs opacity-80 ${className ?? ''}`}>
      <h3 className="text-sm font-semibold mb-2">Resulting Deck</h3>
      <div>Resulting deck mockup (coming soon)</div>
    </div>
  );
};

export default CPResultingDeck;
