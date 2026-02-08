import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/useGameResults.ts';

interface SubpageMatchupsProps {
  matches: MatchResult[];
}

const SubpageMatchups: React.FC<SubpageMatchupsProps> = ({ matches }) => {
  return <div>SubpageMatchups (Matches count: {matches.length})</div>;
};

export default SubpageMatchups;
