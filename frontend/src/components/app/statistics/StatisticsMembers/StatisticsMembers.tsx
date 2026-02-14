import * as React from 'react';
import { useMemo, useState } from 'react';
import { useTeamMembers } from '@/api/teams';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
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
import type { GameResult } from '../../../../../../server/db/schema/game_result.ts';

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
  mostPlayedLeaderCardId?: string;
  mostPlayedBaseCardKey?: string;
}

const buildMatchesFromGames = (games: GameResult[]): MatchResult[] => {
  const matchesObject: Record<string, MatchResult> = {};

  games.forEach(game => {
    const matchId = game.matchId || `manual-${game.id}`;
    if (!matchesObject[matchId]) {
      matchesObject[matchId] = {
        id: matchId,
        type: 'other',
        games: [],
        gameSource: game.gameSource,
        format: game.format ?? '',
        leaderCardId: game.leaderCardId ?? undefined,
        baseCardKey: game.baseCardKey ?? undefined,
        opponentLeaderCardId: game.opponentLeaderCardId ?? undefined,
        opponentBaseCardKey: game.opponentBaseCardKey ?? undefined,
        deckId: game.deckId ?? undefined,
        userEventId: game.userEventId ?? undefined,
        exclude: false,
        manuallyEdited: false,
        firstGameCreatedAt: '',
      };
    }
    matchesObject[matchId].games.push(game);
  });

  Object.values(matchesObject).forEach(match => {
    match.exclude = match.games.every(g => g.exclude);
    match.manuallyEdited = match.games.some(g => g.manuallyEdited);

    const gameCount = match.games.length;
    if (gameCount === 1) match.type = 'Bo1';
    else if (gameCount >= 2 && gameCount <= 3) match.type = 'Bo3';
    else match.type = 'other';

    let wins = 0;
    let losses = 0;
    match.games.forEach(g => {
      if (g.isWinner === true) wins++;
      else if (g.isWinner === false) losses++;
    });

    match.finalWins = wins;
    match.finalLosses = losses;

    if (wins > losses) match.result = 3;
    else if (wins === losses) match.result = 1;
    else match.result = 0;

    match.games.sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0));

    const firstGame = match.games.reduce((prev, curr) =>
      new Date(prev.createdAt ?? 0).getTime() < new Date(curr.createdAt ?? 0).getTime()
        ? prev
        : curr,
    );
    match.firstGameCreatedAt = firstGame.createdAt ?? '';
  });

  return Object.values(matchesObject).sort(
    (a, b) => new Date(b.firstGameCreatedAt).getTime() - new Date(a.firstGameCreatedAt).getTime(),
  );
};

const getMostPlayedLeaderBase = (
  matches: MatchResult[],
): { leaderCardId?: string; baseCardKey?: string } => {
  const counts: Record<string, number> = {};
  matches.forEach(m => {
    if (m.leaderCardId && m.baseCardKey) {
      const key = `${m.leaderCardId}|${m.baseCardKey}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  let maxKey: string | undefined;
  let maxCount = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }

  if (!maxKey) return {};
  const [leaderCardId, baseCardKey] = maxKey.split('|');
  return { leaderCardId, baseCardKey };
};

const StatisticsMembers: React.FC<StatisticsMembersProps> = ({ teamId }) => {
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);
  const gameResultData = useGameResults({ teamId });
  const { data: cardListData } = useCardList();

  const memberStats = useMemo<MemberStats[]>(() => {
    if (!members || !gameResultData) return [];

    const gamesByUser: Record<string, GameResult[]> = {};
    gameResultData.games.array.forEach(game => {
      const uid = game.userId;
      if (!gamesByUser[uid]) gamesByUser[uid] = [];
      gamesByUser[uid].push(game);
    });

    return members
      .map(member => {
        const userGames = gamesByUser[member.userId] ?? [];
        const matches = buildMatchesFromGames(userGames);

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

        const { leaderCardId, baseCardKey } = getMostPlayedLeaderBase(matches);

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
          mostPlayedLeaderCardId: leaderCardId,
          mostPlayedBaseCardKey: baseCardKey,
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
        <MemberStatsRow key={member.userId} member={member} cardListData={cardListData} />
      ))}
    </div>
  );
};

interface MemberStatsRowProps {
  member: MemberStats;
  cardListData: any;
}

const MemberStatsRow: React.FC<MemberStatsRowProps> = ({ member, cardListData }) => {
  const [isOpen, setIsOpen] = useState(false);

  const leaderCard = member.mostPlayedLeaderCardId
    ? cardListData?.cards[member.mostPlayedLeaderCardId]
    : undefined;

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
                <div className="flex items-center gap-2">
                  {leaderCard && (
                    <LeaderAvatar cardId={member.mostPlayedLeaderCardId} size="30" shape="circle" />
                  )}
                  {member.mostPlayedBaseCardKey && (
                    <BaseAvatar cardId={member.mostPlayedBaseCardKey} size="30" shape="circle" />
                  )}
                </div>
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
                        <LeaderAvatar cardId={entry.leaderCardId} size="30" shape="circle" />
                        <BaseAvatar cardId={entry.baseCardKey} size="30" shape="circle" />
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
