import { useMemo } from 'react';
import { useGetTournamentGroups } from '@/api/tournament-groups';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup.ts';

interface UsePQTournamentGroupsResult {
  isLoading: boolean;
  tournamentGroupsData: ReturnType<typeof useGetTournamentGroups>['data'];
  pqWeekGroups: TournamentGroupWithMeta[];
  mostRecentWeekIndex: number;
}

export const usePQTournamentGroups = (metaId: number | undefined): UsePQTournamentGroupsResult => {
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

  const pqWeekGroups = useMemo(() => {
    if (!tournamentGroupsData) return [] as TournamentGroupWithMeta[];

    const allGroups: TournamentGroupWithMeta[] = tournamentGroupsData.pages.flatMap(
      page => page.data,
    );

    const filteredGroups = allGroups.filter(group => {
      const match = group.group.name.match(/^PQ Week (\d+)$/);
      return match !== null;
    });

    return filteredGroups.sort((a, b) => {
      const weekNumberA = parseInt(a.group.name.match(/^PQ Week (\d+)$/)?.[1] || '0', 10);
      const weekNumberB = parseInt(b.group.name.match(/^PQ Week (\d+)$/)?.[1] || '0', 10);
      return weekNumberA - weekNumberB;
    });
  }, [tournamentGroupsData]);

  const currentDate = new Date();

  const mostRecentWeekIndex = useMemo(() => {
    if (!pqWeekGroups.length) return -1;

    const weekDates = pqWeekGroups.map(group => {
      const latestDate = group.tournaments.reduce((latest, tournament) => {
        const tournamentDate = new Date(tournament.tournament.date);
        return tournamentDate > latest ? tournamentDate : latest;
      }, new Date(0));
      return latestDate;
    });

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

  return { isLoading, tournamentGroupsData, pqWeekGroups, mostRecentWeekIndex };
};

export default usePQTournamentGroups;
