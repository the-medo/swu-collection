import { Button } from '@/components/ui/button.tsx';
import { useGetTournaments } from '@/api/tournaments/useGetTournaments.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useMemo } from 'react';
import {
  TournamentData,
  type TournamentTypeKey,
  tournamentTypesInfo,
} from '../../../../../../types/Tournament.ts';
import * as React from 'react';
import MetaTabs, { MetaTabsProps } from '@/components/app/meta/MetaTabs/MetaTabs.tsx';
import { format } from 'date-fns';

interface MetaPageContentProps {
  formatId: number;
  metaId: number;
  minTournamentType: string;
  tournaments?: TournamentData[];
  tournamentGroupId?: string;
  route?: MetaTabsProps['route'];
}

const todayDate = format(new Date(), 'yyyy-MM-dd');

const MetaPageContent: React.FC<MetaPageContentProps> = ({
  formatId,
  metaId,
  minTournamentType,
  tournaments,
  tournamentGroupId,
  route,
}) => {
  const { data, isFetching, isError, refetch } = useGetTournaments(
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

  if (!tournaments && isFetching && !data) return <Skeleton className="h-80 w-full rounded-2xl" />;
  if (!tournaments && isError && !data)
    return (
      <div className="rounded-lg border p-3 space-y-2" role="alert">
        <p>Could not load tournaments for this meta.</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  return (
    <MetaTabs
      tournaments={tournamentsData}
      metaId={metaId}
      tournamentGroupId={tournamentGroupId}
      route={route}
    />
  );
};

export default MetaPageContent;
