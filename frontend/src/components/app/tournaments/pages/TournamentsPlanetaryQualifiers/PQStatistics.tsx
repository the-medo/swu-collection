import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { AlertCircle, Calendar, CheckCircle, PieChart } from 'lucide-react';
import WeekSelector, { ALL_WEEKS_VALUE } from './WeekSelector.tsx';
import WeekChangeButtons from './WeekChangeButtons.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import PQPageNavigation from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/PQPageNavigation.tsx';
import { useMemo, useState } from 'react';
import MetaInfoSelector, {
  MetaInfo,
} from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import PQStatPieChart from './PQStatPieChart.tsx';
import PQStatChart from './PQStatChart.tsx';
import TopTournaments from './TopTournaments.tsx';
import UnusualChampions from './UnusualChampions/UnusualChampions.tsx';
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

interface PQStatisticsProps {
  tournamentGroups: TournamentGroupWithMeta[];
  onOpenAllTournaments?: () => void;
}

const PQStatistics: React.FC<PQStatisticsProps> = ({ tournamentGroups, onOpenAllTournaments }) => {
  const [metaInfo, setMetaInfo] = useState<MetaInfo>('leaders');

  const statistics = useStatistics(tournamentGroups);
  const processedTournamentGroups = useProcessedTournamentGroups(tournamentGroups);

  const { weekId, page = 'champions' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const chartTop = (page === 'tournaments' ? 'total' : page) as 'champions' | 'top8' | 'total';

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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Tournament Information Section */}
      <div className="md:col-span-8 lg:col-span-9 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex grow items-center gap-2">
            <WeekSelector
              value={selectedGroupId || undefined}
              onValueChange={handleWeekSelect}
              processedTournamentGroups={processedTournamentGroups}
            />
          </div>
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <PQPageNavigation />
          <MetaInfoSelector value={metaInfo} onChange={setMetaInfo} />
        </div>

        {/* Display information about the selected week */}
        {selectedGroupId && (
          <>
            {hasData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <div className="flex flex-col gap-4 md:col-span-4 lg:col-span-3 border rounded-md pb-4 mb-4">
        {/* Imported Tournaments Card */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mr-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Imported PQs</p>
              <h3 className="text-2xl font-bold">
                {statistics.importedTournaments} / {statistics.totalTournaments}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <h3 className="text-2xl font-bold">{statistics.upcomingTournaments}</h3>
            </div>
          </div>
        </div>

        {/* Unusual Champions Section */}
        <UnusualChampions tournamentGroups={tournamentGroups} handleWeekSelect={handleWeekSelect} />

        {/* Top 5 Biggest Tournaments Table */}
        <TopTournaments
          tournamentGroups={tournamentGroups}
          processedTournamentGroups={processedTournamentGroups}
          handleWeekSelect={handleWeekSelect}
          onOpenAllTournaments={onOpenAllTournaments}
        />
      </div>
    </div>
  );
};

export default PQStatistics;
