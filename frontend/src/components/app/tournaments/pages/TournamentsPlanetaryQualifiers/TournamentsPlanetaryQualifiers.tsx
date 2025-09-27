import * as React from 'react';
import TournamentPageHeader from '@/components/app/tournaments/TournamentPageHeader';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';
import { useSearch } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useGetTournamentGroups } from '@/api/tournament-groups';
import PQStatistics from './PQStatistics';
import WeekColumns from './WeekColumns.tsx';
import { Loader2 } from 'lucide-react';

interface TournamentsPlanetaryQualifiersProps {}

const TournamentsPlanetaryQualifiers: React.FC<TournamentsPlanetaryQualifiersProps> = ({}) => {
  const { metaId } = useSearch({ strict: false });
  const [openAllCollapsibles, setOpenAllCollapsibles] = useState(false);

  const params = useMemo(
    () => ({
      meta: metaId,
      visible: false,
      includeStats: true,
      nameTemplate: 'PQ Week%',
    }),
    [metaId],
  );

  const { data: tournamentGroupsData, isLoading } = useGetTournamentGroups(params);

  // Filter and sort PQ Week tournament groups
  const pqWeekGroups = useMemo(() => {
    if (!tournamentGroupsData) return [];

    // Extract all tournament groups
    const allGroups = tournamentGroupsData.pages.flatMap(page => page.data);

    // Filter groups that match the "PQ Week ${weekNumber}" pattern
    const filteredGroups = allGroups.filter(group => {
      const match = group.group.name.match(/^PQ Week (\d+)$/);
      return match !== null;
    });

    // Sort groups by week number
    return filteredGroups.sort((a, b) => {
      const weekNumberA = parseInt(a.group.name.match(/^PQ Week (\d+)$/)?.[1] || '0', 10);
      const weekNumberB = parseInt(b.group.name.match(/^PQ Week (\d+)$/)?.[1] || '0', 10);
      return weekNumberA - weekNumberB;
    });
  }, [tournamentGroupsData]);

  // Determine the most recent and upcoming weeks
  const currentDate = new Date();

  // Find the most recent week (the week with the latest tournament date that is in the past)
  const mostRecentWeekIndex = useMemo(() => {
    if (!pqWeekGroups.length) return -1;

    // Find the latest tournament date for each week
    const weekDates = pqWeekGroups.map(group => {
      const latestDate = group.tournaments.reduce((latest, tournament) => {
        const tournamentDate = new Date(tournament.tournament.date);
        return tournamentDate > latest ? tournamentDate : latest;
      }, new Date(0));
      return latestDate;
    });

    // Find the most recent week (latest date that is in the past)
    let mostRecentIndex = -1;
    let mostRecentDate = new Date(0);

    weekDates.forEach((date, index) => {
      if (date <= currentDate && date > mostRecentDate) {
        mostRecentDate = date;
        mostRecentIndex = index;
      }
    });

    return mostRecentIndex;
  }, [pqWeekGroups]);

  return (
    <>
      <TournamentNavigation />
      <TournamentPageHeader title="Planetary Qualifiers" />
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        <>
          {metaId && pqWeekGroups.length > 0 && (
            <PQStatistics
              tournamentGroups={pqWeekGroups}
              onOpenAllTournaments={() => setOpenAllCollapsibles(p => !p)}
            />
          )}

          {(!metaId || !pqWeekGroups.length) && (
            <div className="p-8 text-center text-gray-500">
              <p>
                {metaId
                  ? 'No Planetary Qualifiers data found.'
                  : 'Please select a meta to view Planetary Qualifiers.'}
              </p>
            </div>
          )}

          {metaId && pqWeekGroups.length > 0 && (
            <WeekColumns
              pqWeekGroups={pqWeekGroups}
              mostRecentWeekIndex={mostRecentWeekIndex}
              openAllCollapsibles={openAllCollapsibles}
            />
          )}
        </>
      )}
    </>
  );
};

export default TournamentsPlanetaryQualifiers;
