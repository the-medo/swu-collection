import * as React from 'react';

export interface MostPlayedCardsProps {
  payload: any;
}

const MostPlayedCards: React.FC<MostPlayedCardsProps> = ({ payload }) => {
  return (
    <div className="h-full w-full">
      <div className="text-sm font-semibold mb-2">Most Played Cards</div>
      <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
};

export default MostPlayedCards;
