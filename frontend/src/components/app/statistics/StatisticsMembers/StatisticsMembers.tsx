import * as React from 'react';
import { useMemo, useState } from 'react';
import { useTeamMembers } from '@/api/teams';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { StatSectionCompact } from '@/components/app/statistics/common/StatSectionCompact.tsx';
import { getWRColor } from '@/components/app/statistics/common/statsUtils.ts';
import { ChevronDown, ChevronRight } from 'lucide-react';
import LeaderAvatar from '@/components/app/global/LeaderAvatar.tsx';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import type { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';

interface StatisticsMembersProps {
  teamId: string;
}

interface MemberStats {
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

interface MemberStatsRowProps {
  member: MemberStats;
}

const MemberStatsRow: React.FC<MemberStatsRowProps> = ({ member }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Group matches by leader/base for the expanded detail
  const leaderBaseBreakdown = useMemo(() => {
    const groups: Record<
      string,
      { leaderCardId: string; baseCardKey: string; wins: number; losses: number; total: number }
    > = {};

    member.matches.forEach(m => {
      if (m.leaderCardId && m.baseCardKey) {
        const key = `${m.leaderCardId}|${m.baseCardKey}`;
        if (!groups[key]) {
          groups[key] = {
            leaderCardId: m.leaderCardId,
            baseCardKey: m.baseCardKey,
            wins: 0,
            losses: 0,
            total: 0,
          };
        }
        groups[key].total++;
        if (m.result === 3) groups[key].wins++;
        else if (m.result === 0) groups[key].losses++;
      }
    });

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [member.matches]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardContent className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="text-muted-foreground">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>

            <Avatar className="w-10 h-10">
              <AvatarImage src={member.image ?? undefined} alt={member.name ?? 'User'} />
              <AvatarFallback>{(member.name ?? 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-medium truncate">{member.name ?? 'Unknown user'}</span>
              <span className="text-xs text-muted-foreground">
                {member.totalMatches} {member.totalMatches === 1 ? 'match' : 'matches'}
              </span>
            </div>

            {member.totalMatches > 0 && (
              <div className="flex items-center gap-4 flex-wrap justify-end">
                <StatSectionCompact
                  label="Matches"
                  wins={member.wins}
                  losses={member.losses}
                  winrate={member.winRate}
                />
                <StatSectionCompact
                  label="Games"
                  wins={member.gameWins}
                  losses={member.gameLosses}
                  winrate={member.gameWinRate}
                />
              </div>
            )}
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {member.totalMatches > 0 && leaderBaseBreakdown.length > 0 && (
            <div className="px-6 pb-4 pt-0">
              <div className="border-t pt-3">
                <span className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                  Leader & Base breakdown
                </span>
                <div className="flex flex-col gap-1">
                  {leaderBaseBreakdown.map(entry => {
                    const winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
                    return (
                      <div
                        key={`${entry.leaderCardId}|${entry.baseCardKey}`}
                        className="flex items-center gap-2 py-1"
                      >
                        <LeaderAvatar cardId={entry.leaderCardId} size="40" shape="circle" />
                        <BaseAvatar cardId={entry.baseCardKey} size="40" shape="circle" />
                        <span className="text-xs font-black whitespace-nowrap ml-1">
                          {entry.wins}W-{entry.losses}L
                        </span>
                        <span className={`text-xs font-bold ${getWRColor(winRate)}`}>
                          {winRate.toFixed(0)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({entry.total} {entry.total === 1 ? 'match' : 'matches'})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {member.totalMatches === 0 && (
            <div className="px-6 pb-4 pt-0">
              <div className="border-t pt-3 text-sm text-muted-foreground">
                No matches recorded in the selected time period.
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default StatisticsMembers;
