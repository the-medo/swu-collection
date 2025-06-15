import { useState } from 'react';
import { Accordion } from '@/components/ui/accordion.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useGetTournaments } from '@/api/tournaments/useGetTournaments.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useWeeklyTournaments } from '@/hooks/useWeeklyTournaments.ts';
import { PQWeeklyData } from './PQWeeklyData.tsx';
import { PQWeeklyDivision } from './PQWeeklyDivision.tsx';
import { PQWeeklyTournamentGroups } from './PQWeeklyTournamentGroups.tsx';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector.tsx';
import { TournamentData } from '../../../../../../types/Tournament.ts';

export function PQWeekTools() {
  const [format, setFormat] = useState<number | null>(1);
  const [meta, setMeta] = useState<number | null>(null);
  const [pqTournaments, setPqTournaments] = useState<TournamentData[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Use the hook to transform tournaments into weekly divisions
  const weeklyTournaments = useWeeklyTournaments(pqTournaments);

  const getTournamentsQuery = useGetTournaments(
    {
      type: 'pq',
      format: format !== null ? format : undefined,
      meta: meta !== null ? meta : undefined,
      limit: 200,
    },
    false,
  ); // disabled by default, we'll trigger it manually

  const handleFetchPQs = async () => {
    setIsFetching(true);
    try {
      await getTournamentsQuery.refetch();
      const allPages = getTournamentsQuery.data?.pages || [];
      const allTournaments = allPages.flatMap(page => page.data || []);

      setPqTournaments(allTournaments);

      toast({
        title: 'Success',
        description: `Fetched ${allTournaments.length} PQ tournaments`,
      });
    } catch (error) {
      console.error('Error fetching PQ tournaments:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch PQ tournaments',
      });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="w-[200px]">
          <FormatSelect
            value={format}
            onChange={setFormat}
            allowEmpty={true}
            className="w-[180px]"
          />
        </div>
        <div className="w-[500px]">
          <MetaSelector
            value={meta}
            onChange={setMeta}
            emptyOption={true}
            formatId={format || undefined}
          />
        </div>

        <Button onClick={handleFetchPQs} disabled={isFetching || getTournamentsQuery.isFetching}>
          {isFetching || getTournamentsQuery.isFetching ? 'Fetching...' : 'Fetch PQs'}
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {pqTournaments.length > 0 && (
          <>
            <PQWeeklyData tournaments={pqTournaments} />
            <PQWeeklyDivision
              weeklyTournaments={weeklyTournaments}
              totalTournaments={pqTournaments.length}
            />
            <PQWeeklyTournamentGroups
              weeklyTournaments={weeklyTournaments}
              meta={meta}
              format={format}
            />
          </>
        )}
      </Accordion>
    </div>
  );
}
