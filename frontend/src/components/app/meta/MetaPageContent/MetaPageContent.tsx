import { useGetTournaments } from '@/api/tournaments/useGetTournaments.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useMemo } from 'react';
import { tournamentTypesInfo } from '../../../../../../types/Tournament.ts';
import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import MetaTabs from '@/components/app/meta/MetaTabs/MetaTabs.tsx';

interface MetaPageContentProps {
  formatId: number;
  metaId: number;
  minTournamentType: string;
}

const MetaPageContent: React.FC<MetaPageContentProps> = ({
  formatId,
  metaId,
  minTournamentType,
}) => {
  const { data, isFetching } = useGetTournaments({
    format: formatId,
    meta: metaId,
  });

  const tournamentsFromMinType = useMemo(() => {
    if (!data) return [];
    return data.pages
      .flatMap(page => page.data || [])
      .filter(
        t =>
          tournamentTypesInfo[t.tournamentType.id].sortValue >=
          tournamentTypesInfo[minTournamentType].sortValue,
      );
  }, [data, minTournamentType]);

  if (isFetching) return <Skeleton className="h-full w-full rounded-md" />;
  return <MetaTabs tournaments={tournamentsFromMinType} />;
};

export default MetaPageContent;
