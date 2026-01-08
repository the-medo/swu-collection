import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { AlertCircle } from 'lucide-react';
import WeekSelector, { ALL_WEEKS_VALUE, WEEK_TO_WEEK_VALUE } from './WeekSelector.tsx';
import WeekToWeekData from './WeekToWeek/WeekToWeekData.tsx';
import WeekChangeButtons from './WeekChangeButtons.tsx';
import PQSideStats from './PQSideStats.tsx';
import WeekToWeekSideStats from './WeekToWeek/SideStats/WeekToWeekSideStats.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useStatistics } from './hooks/useStatistics.ts';
import { useProcessedTournamentGroups } from './hooks/useProcessedTournamentGroups.ts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import DiscordPing from '@/components/app/global/DiscordPing.tsx';
import { cn } from '@/lib/utils.ts';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import MetaPageContent from '@/components/app/meta/MetaPageContent/MetaPageContent.tsx';
import { Route as PlanetaryQualifiersRoute } from '@/routes/tournaments/planetary-qualifiers';
import PQSelectedWeekTournaments from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/PQSelectedWeekTournaments.tsx';
import TournamentDetailContent from '@/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailContent.tsx';

interface PQStatisticsProps {
  tournamentGroups: TournamentGroupWithMeta[];
  onOpenAllTournaments?: () => void;
  metaId: number;
}

const PQStatistics: React.FC<PQStatisticsProps> = ({
  tournamentGroups,
  onOpenAllTournaments,
  metaId,
}) => {
  const {
    weekId,
    pageWtw = 'champions',
    maMetaInfo,
    maTournamentId,
    formatId = 1,
  } = useSearch({ strict: false });
  const metaInfo = (maMetaInfo ?? 'leaders') as MetaInfo;

  const statistics = useStatistics(tournamentGroups);
  const processedTournamentGroups = useProcessedTournamentGroups(tournamentGroups);
  const navigate = useNavigate();
  const chartTop = (pageWtw === 'tournaments' ? 'total' : pageWtw) as PQTop;

  // Find the most recent group ID for default selection
  const mostRecentGroupId = useMemo(() => {
    const mostRecentGroup = processedTournamentGroups.find(group => group.isMostRecent);
    return mostRecentGroup?.group.id || null;
  }, [processedTournamentGroups]);

  const selectedGroupId = weekId || mostRecentGroupId;
  const isMostRecent = selectedGroupId === mostRecentGroupId;

  const tournamentsToDisplay = useMemo(() => {
    if (weekId === ALL_WEEKS_VALUE) {
      return processedTournamentGroups.map(group => group.tournaments).flat(1);
    }
    return processedTournamentGroups.find(group => group.group.id === selectedGroupId)?.tournaments;
  }, [processedTournamentGroups, selectedGroupId, weekId]);

  // Handle week selection
  const handleWeekSelect = (tournamentGroupId: string) => {
    navigate({
      to: '.',
      search: prev => ({
        ...prev,
        weekId: tournamentGroupId,
        maTournamentId: undefined,
      }),
    });
  };

  // const hasData = data && data.length > 0;
  const hasData = processedTournamentGroups && processedTournamentGroups.length > 0;

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
          </div>
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
              <div className="flex flex-1">
                {maTournamentId ? (
                  <TournamentDetailContent maTournamentId={maTournamentId} />
                ) : (
                  <MetaPageContent
                    formatId={formatId}
                    metaId={metaId}
                    minTournamentType={'pq'}
                    tournaments={tournamentsToDisplay || []}
                    tournamentGroupId={selectedGroupId}
                    route={PlanetaryQualifiersRoute}
                  />
                )}
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
      ) : selectedGroupId === ALL_WEEKS_VALUE ? (
        <PQSideStats
          statistics={statistics}
          tournamentGroups={tournamentGroups}
          processedTournamentGroups={processedTournamentGroups}
          handleWeekSelect={handleWeekSelect}
          onOpenAllTournaments={onOpenAllTournaments}
        />
      ) : (
        <PQSelectedWeekTournaments tournaments={tournamentsToDisplay || []} />
      )}
    </div>
  );
};

export default PQStatistics;
