import * as React from 'react';
import TournamentPageHeader from '@/components/app/tournaments/TournamentPageHeader';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';
import { useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import PQStatistics from './PQStatistics';
import { usePQTournamentGroups } from './hooks/usePQTournamentGroups';
import WeekColumns from './WeekColumns.tsx';
import { Loader2 } from 'lucide-react';

interface TournamentsPlanetaryQualifiersProps {}

const TournamentsPlanetaryQualifiers: React.FC<TournamentsPlanetaryQualifiersProps> = ({}) => {
  const { metaId } = useSearch({ strict: false });
  const [openAllCollapsibles, setOpenAllCollapsibles] = useState(false);

  const { isLoading, pqWeekGroups, mostRecentWeekIndex } = usePQTournamentGroups(
    metaId as number | undefined,
  );

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
