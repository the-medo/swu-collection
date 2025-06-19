import { useGetTournaments } from '@/api/tournaments/useGetTournaments.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useMemo } from 'react';
import {
  TournamentData,
  type TournamentTypeKey,
  tournamentTypesInfo,
} from '../../../../../../types/Tournament.ts';
import * as React from 'react';
import MetaTabs from '@/components/app/meta/MetaTabs/MetaTabs.tsx';
import { format } from 'date-fns';

interface MetaPageContentProps {
  formatId: number;
  metaId: number;
  minTournamentType: string;
  tournaments?: TournamentData[];
  tournamentGroupId?: string;
}

const todayDate = format(new Date(), 'yyyy-MM-dd');

const MetaPageContent: React.FC<MetaPageContentProps> = ({
  formatId,
  metaId,
  minTournamentType,
  tournaments,
  tournamentGroupId,
}) => {
  const { data, isFetching } = useGetTournaments(
    {
      format: formatId,
      meta: metaId,
      minType: tournamentTypesInfo[minTournamentType as TournamentTypeKey].sortValue,
      maxDate: todayDate,
      limit: 250,
    },
    !tournaments,
  );

  const tournamentsData = useMemo(() => {
    if (tournaments) return tournaments;
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data, tournaments]);

  if (isFetching) return <Skeleton className="h-full w-full rounded-md" />;
  return <MetaTabs tournaments={tournamentsData} metaId={metaId} tournamentGroupId={tournamentGroupId} />;
};

export default MetaPageContent;
