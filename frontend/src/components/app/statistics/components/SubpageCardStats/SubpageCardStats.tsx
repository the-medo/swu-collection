import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { useMemo, useState } from 'react';
import CardStatsTable from './CardStatsTable/CardStatsTable.tsx';

interface SubpageCardStatsProps {
  matches: MatchResult[];
}

const SubpageCardStats: React.FC<SubpageCardStatsProps> = ({ matches }) => {
  const [hasIni, setHasIni] = useState<boolean>();
  const [gameNumber, setGameNumber] = useState<1 | 2>(); // undefined = all games, 1 = pre-sideboard, 2 = post-sideboard

  const games = useMemo(() => {
    let result = (matches ?? []).flatMap(m => m.games);
    if (hasIni !== undefined) result = result.filter(g => g.hasInitiative === hasIni);
    if (gameNumber !== undefined)
      result = result.filter(
        g =>
          gameNumber === 1
            ? g.gameNumber === 1 // only pre-sideboard games
            : (g.gameNumber ?? 0) > 1, //only post-sideboard games
      );
    return result;
  }, [matches, hasIni, gameNumber]);

  return (
    <div className="flex flex-col gap-4">
      <div>SubpageCardStats (Game count: {games.length})</div>
      <CardStatsTable games={games} />
    </div>
  );
};

export default SubpageCardStats;
