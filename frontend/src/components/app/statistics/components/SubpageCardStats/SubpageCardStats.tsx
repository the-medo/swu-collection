import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/useGameResults.ts';

interface SubpageCardStatsProps {
  matches: MatchResult[];
}

const SubpageCardStats: React.FC<SubpageCardStatsProps> = ({ matches }) => {
  return <div>SubpageCardStats (Matches count: {matches.length})</div>;
};

export default SubpageCardStats;
