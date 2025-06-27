import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { AlertCircle, PieChart } from 'lucide-react';
import WeekSelector, { ALL_WEEKS_VALUE, WEEK_TO_WEEK_VALUE } from './WeekSelector.tsx';
import WeekToWeekData from './WeekToWeek/WeekToWeekData.tsx';
import WeekChangeButtons from './WeekChangeButtons.tsx';
import PQSideStats from './PQSideStats.tsx';
import WeekToWeekSideStats from './WeekToWeek/SideStats/WeekToWeekSideStats.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import PQPageNavigation from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/PQPageNavigation.tsx';
import { useMemo } from 'react';
import MetaInfoSelector, {
  MetaInfo,
} from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import PQStatPieChart from './PQStatPieChart.tsx';
import PQStatChart from './PQStatChart.tsx';
import { useStatistics } from './hooks/useStatistics.ts';
import { useProcessedTournamentGroups } from './hooks/useProcessedTournamentGroups.ts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { TournamentGroupLeaderBase } from '../../../../../../../server/db/schema/tournament_group_leader_base.ts';
import DiscordPing from '@/components/app/global/DiscordPing.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';

interface PQStatisticsProps {
  tournamentGroups: TournamentGroupWithMeta[];
  onOpenAllTournaments?: () => void;
}

const PQStatistics: React.FC<PQStatisticsProps> = ({ tournamentGroups, onOpenAllTournaments }) => {
  const search = useSearch({ strict: false });
  const metaInfo = (search.maMetaInfo ?? 'leaders') as MetaInfo;

  const statistics = useStatistics(tournamentGroups);
  const processedTournamentGroups = useProcessedTournamentGroups(tournamentGroups);

  const { weekId, page = 'champions' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });
  const chartTop = (page === 'tournaments' ? 'total' : page) as PQTop;

  // Find the most recent group ID for default selection
  const mostRecentGroupId = useMemo(() => {
    const mostRecentGroup = processedTournamentGroups.find(group => group.isMostRecent);
    return mostRecentGroup?.group.id || null;
  }, [processedTournamentGroups]);

  const selectedGroupId = weekId || mostRecentGroupId;
  const isMostRecent = selectedGroupId === mostRecentGroupId;

  // Handle week selection
  const handleWeekSelect = (tournamentGroupId: string) => {
    navigate({
      search: prev => ({
        ...prev,
        weekId: tournamentGroupId,
      }),
    });
  };

  const handleMetaInfoChange = (mi: MetaInfo) => {
    navigate({
      search: prev => ({
        ...prev,
        maMetaInfo: mi,
      }),
    });
  };

  const data: TournamentGroupLeaderBase[] | null = useMemo(() => {
    if (selectedGroupId === ALL_WEEKS_VALUE) {
      // Combine leaderBase data from all tournament groups
      return processedTournamentGroups.reduce((acc, group) => {
        if (group.leaderBase && group.leaderBase.length > 0 && !group.isUpcoming) {
          return [...acc, ...group.leaderBase];
        }
        return acc;
      }, [] as TournamentGroupLeaderBase[]);
    }

    // Handle individual week selection
    const selectedGroup = processedTournamentGroups.find(
      group => group.group.id === selectedGroupId,
    );

    return selectedGroup?.leaderBase || null;
  }, [selectedGroupId, processedTournamentGroups]);

  const hasData = data && data.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Tournament Information Section */}
      <div className="lg:col-span-8 xl:col-span-9 space-y-2">
        <div className={cn('flex items-center gap-2 flex-wrap')}>
          <div className="flex grow items-center gap-2">
            <WeekSelector
              value={selectedGroupId || undefined}
              onValueChange={handleWeekSelect}
              processedTournamentGroups={processedTournamentGroups}
            />
          </div>
          <div className="flex items-center gap-2">
            <WeekChangeButtons
              selectedGroupId={selectedGroupId}
              processedTournamentGroups={processedTournamentGroups}
              onWeekChange={handleWeekSelect}
            />
            {selectedGroupId && (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 h-12"
                        disabled={selectedGroupId === ALL_WEEKS_VALUE}
                        onClick={() => {
                          navigate({
                            to: '/meta',
                            search: { maTournamentGroupId: selectedGroupId },
                          });
                        }}
                      >
                        <PieChart className="h-4 w-4" />
                        Full meta analysis
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {selectedGroupId === ALL_WEEKS_VALUE
                      ? 'Viewing full meta analysis is possible only for single weeks right now'
                      : 'Display full meta analysis, matchups, decks and card statistics'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <PQPageNavigation />
          <MetaInfoSelector value={metaInfo} onChange={handleMetaInfoChange} />
        </div>

        {/* Display information about the selected week */}
        {selectedGroupId && (
          <>
            {selectedGroupId === WEEK_TO_WEEK_VALUE ? (
              <WeekToWeekData
                metaInfo={metaInfo}
                top={chartTop}
                statistics={statistics}
                tournamentGroups={tournamentGroups}
                processedTournamentGroups={processedTournamentGroups}
              />
            ) : hasData ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <PQStatPieChart metaInfo={metaInfo} data={data} top={chartTop} />
                <PQStatChart metaInfo={metaInfo} data={data} top={chartTop} />
              </div>
            ) : (
              <Alert variant="info" className="mt-6 mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No data</AlertTitle>
                <AlertDescription>
                  {selectedGroupId === ALL_WEEKS_VALUE ? (
                    <>
                      <p>No statistics available across all weeks.</p>
                      <p>
                        Planetary Qualifiers probably haven't started yet, but you can still select
                        and view PQs from older sets.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>No information available for the selected week.</p>
                      {isMostRecent && (
                        <p>
                          Because it's the most recent week, it is probably too early to analyze the
                          data.
                        </p>
                      )}
                    </>
                  )}
                  <DiscordPing />
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>

      {selectedGroupId === WEEK_TO_WEEK_VALUE ? (
        <WeekToWeekSideStats
          metaInfo={metaInfo}
          top={chartTop}
          statistics={statistics}
          tournamentGroups={tournamentGroups}
          processedTournamentGroups={processedTournamentGroups}
          handleWeekSelect={handleWeekSelect}
        />
      ) : (
        <PQSideStats
          statistics={statistics}
          tournamentGroups={tournamentGroups}
          processedTournamentGroups={processedTournamentGroups}
          handleWeekSelect={handleWeekSelect}
          onOpenAllTournaments={onOpenAllTournaments}
        />
      )}
    </div>
  );
};

export default PQStatistics;
