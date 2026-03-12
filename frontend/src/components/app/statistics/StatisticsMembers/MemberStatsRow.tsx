import * as React from 'react';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
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
          {member.totalMatches > 0 && (
            <div className="px-6 pb-4 pt-0">
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
