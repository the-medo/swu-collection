import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/useGameResults.ts';

interface SubpageDecklistProps {
  matches: MatchResult[];
}

const SubpageDecklist: React.FC<SubpageDecklistProps> = ({ matches }) => {
  return <div>SubpageDecklist (Matches count: {matches.length})</div>;
};

export default SubpageDecklist;
