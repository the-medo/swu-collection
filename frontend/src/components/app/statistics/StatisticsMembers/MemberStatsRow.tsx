import { areGameAndMatchRecordsEqual } from '@/components/app/statistics/lib/resultStatistics';
import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { Card } from '@/components/ui/card.tsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { StatSectionCompact } from '@/components/app/statistics/common/StatSectionCompact.tsx';
import { MemberStats } from '@/components/app/statistics/StatisticsMembers/StatisticsMembers.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import MatchResultStatsTable from '@/components/app/statistics/common/MatchResultStatsTable/MatchResultStatsTable.tsx';

interface MemberStatsRowProps {
  member: MemberStats;
}

export const MemberStatsRow: React.FC<MemberStatsRowProps> = ({ member }) => {
  const [isOpen, setIsOpen] = useState(false);
  const labelRenderer = useLabel();
  const totalGames = member.matches.reduce((total, match) => total + match.games.length, 0);
  const gameDraws = totalGames - member.gameWins - member.gameLosses;
  const showMatches = !areGameAndMatchRecordsEqual({
    ...member,
    totalGames,
    matchWins: member.wins,
    matchLosses: member.losses,
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn('overflow-hidden', statisticsStyles.card, statisticsStyles.member)}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full items-center gap-2 p-3 text-left cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-2 focus-visible:outline-primary',
              statisticsStyles.memberTrigger,
            )}
          >
            <div className="text-muted-foreground">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>

            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={member.image ?? undefined} alt={member.name ?? 'User'} />
              <AvatarFallback>{(member.name ?? 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-medium truncate">{member.name ?? 'Unknown user'}</span>
              <span className="text-xs text-muted-foreground">
                {showMatches
                  ? `${member.totalMatches} ${member.totalMatches === 1 ? 'match' : 'matches'}`
                  : `${totalGames} ${totalGames === 1 ? 'game' : 'games'}`}
              </span>
            </div>

            {member.totalMatches > 0 && (
              <div
                className={cn(
                  'flex items-center gap-2 flex-wrap justify-end',
                  statisticsStyles.memberRecord,
                )}
              >
                {showMatches && (
                  <StatSectionCompact
                    label="Matches"
                    wins={member.wins}
                    losses={member.losses}
                    draws={member.draws}
                    winrate={member.winRate}
                  />
                )}
                <StatSectionCompact
                  label="Games"
                  wins={member.gameWins}
                  losses={member.gameLosses}
                  draws={gameDraws}
                  winrate={member.gameWinRate}
                />
              </div>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {member.totalMatches > 0 && (
            <div className="overflow-x-auto px-3 pb-3">
              <div className="border-t pt-3">
                <MatchResultStatsTable
                  matches={member.matches}
                  keyFunction={match =>
                    match.leaderCardId && match.baseCardKey
                      ? `${match.leaderCardId}|${match.baseCardKey}`
                      : undefined
                  }
                  labelHeader="Leader & Base"
                  labelFunction={key => labelRenderer(key, 'leadersAndBase', 'compact')}
                  emptyMessage="No leader/base data available in the selected time period."
                />
              </div>
            </div>
          )}
          {member.totalMatches === 0 && (
            <div className="overflow-x-auto px-3 pb-3">
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
