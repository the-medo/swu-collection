import * as React from 'react';
import { useMemo } from 'react';
import { StatSection } from '@/components/app/statistics/common/StatSection';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';

interface DashboardOverviewProps {
  matches: MatchResult[] | undefined;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ matches }) => {
  const stats = useMemo(() => {
    if (!matches || matches.length === 0) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalGames: 0,
        gameWins: 0,
        gameLosses: 0,
        gameWinRate: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalGames = 0;
    let gameWins = 0;
    let gameLosses = 0;

    matches.forEach(match => {
      if (match.result === 3) wins++;
      else if (match.result === 1) draws++;
      else if (match.result === 0) losses++;

      totalGames += match.games.length;
      match.games.forEach(game => {
        if (game.isWinner === true) gameWins++;
        else if (game.isWinner === false) gameLosses++;
      });
    });

    const winRate = matches.length > 0 ? (wins / matches.length) * 100 : 0;
    const gameWinRate = totalGames > 0 ? (gameWins / totalGames) * 100 : 0;

    return {
      totalMatches: matches.length,
      wins,
      losses,
      draws,
      winRate,
      totalGames,
      gameWins,
      gameLosses,
      gameWinRate,
    };
  }, [matches]);

  if (!matches) {
    return <div className="text-muted-foreground italic">No matches recorded yet.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-2">
      <div className="flex gap-4">
        <StatSection
          label="Games"
          wins={stats.gameWins}
          losses={stats.gameLosses}
          winrate={stats.gameWinRate}
        />
        <StatSection
          label="Matches"
          wins={stats.wins}
          losses={stats.losses}
          winrate={stats.winRate}
        />
      </div>
    </div>
  );
};

export default DashboardOverview;
