import * as React from 'react';
import TournamentPageHeader from '@/components/app/tournaments/TournamentPageHeader';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';
import TournamentFilters from '@/components/app/tournaments/TournamentFilters/TournamentFilters.tsx';
import TournamentList from '@/components/app/tournaments/TournamentList/TournamentList.tsx';
import { useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';
import { GetTournamentsRequest } from '@/api/tournaments/useGetTournaments.ts';

interface TournamentsAllProps {}

const TournamentsAll: React.FC<TournamentsAllProps> = ({}) => {
  const {
    formatId = 1,
    metaId,
    tfType,
    tfContinent,
    tfDateFrom,
    tfSort,
    tfOrder,
    tfShowFuture,
  } = useSearch({ strict: false });

  const fltrs: GetTournamentsRequest = useMemo(
    () => {
      // Get today's date for filtering
      const today = new Date();

      return {
        format: formatId,
        meta: metaId,
        type: tfType,
        continent: tfContinent,
        date: tfDateFrom,
        // When tfShowFuture is false, set maxDate to today to show only past tournaments
        maxDate: tfShowFuture === true ? undefined : today,
        sort: tfSort,
        order: tfOrder,
      };
    },
    [formatId, metaId, tfType, tfContinent, tfDateFrom, tfSort, tfOrder, tfShowFuture],
  );

  return (
    <>
      <TournamentNavigation />
      <TournamentPageHeader title="Tournaments" />
      <TournamentFilters />
      <TournamentList params={fltrs} />
    </>
  );
};

export default TournamentsAll;
