import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/useGameResults.ts';

interface SubpageMatchesProps {
  matches: MatchResult[];
}

const SubpageMatches: React.FC<SubpageMatchesProps> = ({ matches }) => {
  return <div>SubpageMatches (Matches count: {matches.length})</div>;
};

export default SubpageMatches;
