import * as React from 'react';

interface StatisticsDecksProps {
  scopeId?: string;
}

const StatisticsDecks: React.FC<StatisticsDecksProps> = ({ scopeId }) => {
  return <div>Statistics Decks {scopeId}</div>;
};

export default StatisticsDecks;
