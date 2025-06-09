import { useGetTournaments } from '@/api/tournaments/useGetTournaments.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useMemo } from 'react';
import { TournamentData, tournamentTypesInfo } from '../../../../../../types/Tournament.ts';
import * as React from 'react';
import MetaTabs from '@/components/app/meta/MetaTabs/MetaTabs.tsx';

interface MetaPageContentProps {
  formatId: number;
  metaId: number;
  minTournamentType: string;
  tournaments?: TournamentData[];
}

const MetaPageContent: React.FC<MetaPageContentProps> = ({
  formatId,
  metaId,
  minTournamentType,
  tournaments,
}) => {
  const { data, isFetching } = useGetTournaments(
    {
      format: formatId,
      meta: metaId,
    },
    !tournaments,
  );

  const tournamentsData = useMemo(() => {
    if (tournaments) return tournaments;
    if (!data) return [];
    return data.pages
      .flatMap(page => page.data || [])
      .filter(
        t =>
          tournamentTypesInfo[t.tournamentType.id].sortValue >=
          tournamentTypesInfo[minTournamentType].sortValue,
      );
  }, [data, minTournamentType, tournaments]);

  if (isFetching) return <Skeleton className="h-full w-full rounded-md" />;
  return <MetaTabs tournaments={tournamentsData} metaId={metaId} />;
};

export default MetaPageContent;
