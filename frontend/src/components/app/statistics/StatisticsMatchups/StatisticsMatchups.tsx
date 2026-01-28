import * as React from 'react';

interface StatisticsMatchupsProps {
  scopeId?: string;
}

const StatisticsMatchups: React.FC<StatisticsMatchupsProps> = ({ scopeId }) => {
  return <div>Statistics Matchups {scopeId}</div>;
};

export default StatisticsMatchups;
