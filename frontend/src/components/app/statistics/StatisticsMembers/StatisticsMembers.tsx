import * as React from 'react';
import { useMemo } from 'react';
import { useTeamMembers } from '@/api/teams';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import type { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { MemberStatsRow } from '@/components/app/statistics/StatisticsMembers/MemberStatsRow.tsx';

interface StatisticsMembersProps {
  teamId: string;
}

export interface MemberStats {
  userId: string;
  name: string | null;
  image: string | null;
  matches: MatchResult[];
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  gameWins: number;
  gameLosses: number;
  gameWinRate: number;
}

const StatisticsMembers: React.FC<StatisticsMembersProps> = ({ teamId }) => {
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);
  const gameResultData = useGameResultsContext();

  const memberStats = useMemo<MemberStats[]>(() => {
    if (!members || !gameResultData) return [];

    return members
      .map(member => {
        const matches = gameResultData.matches.byUserId.matches[member.userId] ?? [];

        let wins = 0;
        let losses = 0;
        let draws = 0;
        let gameWins = 0;
        let gameLosses = 0;

        matches.forEach(match => {
          if (match.result === 3) wins++;
          else if (match.result === 1) draws++;
          else if (match.result === 0) losses++;

          match.games.forEach(g => {
            if (g.isWinner === true) gameWins++;
            else if (g.isWinner === false) gameLosses++;
          });
        });

        const totalMatches = matches.length;
        const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
        const totalGames = gameWins + gameLosses;
        const gameWinRate = totalGames > 0 ? (gameWins / totalGames) * 100 : 0;

        return {
          userId: member.userId,
          name: member.name,
          image: member.image,
          matches,
          totalMatches,
          wins,
          losses,
          draws,
          winRate,
          gameWins,
          gameLosses,
          gameWinRate,
        };
      })
      .sort((a, b) => b.totalMatches - a.totalMatches);
  }, [members, gameResultData]);

  if (membersLoading || !gameResultData) {
    return null;
  }

  if (memberStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        No member data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {memberStats.map(member => (
        <MemberStatsRow key={member.userId} member={member} />
      ))}
    </div>
  );
};

export default StatisticsMembers;
