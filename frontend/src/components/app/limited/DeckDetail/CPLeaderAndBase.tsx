import React from 'react';

export interface CPLeaderAndBaseProps {
  deckName?: string;
  className?: string;
}

const CPLeaderAndBase: React.FC<CPLeaderAndBaseProps> = ({ deckName, className }) => {
  return (
    <div className={`rounded-lg border border-border bg-card p-3 ${className ?? ''}`}>
      <h3 className="text-sm font-semibold mb-2">Leader & Base</h3>
      <div className="text-xs opacity-80">
        Mockup leader/base section for deck {deckName ? `"${deckName}"` : ''} (coming soon)
      </div>
    </div>
  );
};

export default CPLeaderAndBase;
