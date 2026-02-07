import * as React from 'react';

interface StatisticsLeaderBasesProps {
  scopeId?: string;
}

const StatisticsLeaderBases: React.FC<StatisticsLeaderBasesProps> = ({ scopeId }) => {
  return <div>Statistics Leader & Bases {scopeId}</div>;
};

export default StatisticsLeaderBases;
