import * as React from 'react';
import TournamentOverviewTable, {
  TournamentOverviewTableRow,
} from '@/components/app/tournaments/components/TournamentOverviewTable.tsx';
import { TournamentData } from '../../../../../../../types/Tournament.ts';

interface PQSelectedWeekTournamentsProps {
  tournaments?: TournamentData[];
}

const PQSelectedWeekTournaments: React.FC<PQSelectedWeekTournamentsProps> = ({ tournaments }) => {
  console.log('rows', tournaments);
  const rows: TournamentOverviewTableRow[] = React.useMemo(() => {
    if (!tournaments) return [];

    return tournaments.map(t => ({
      type: 'item' as const,
      item: {
        tournament: t.tournament,
        winningTournamentDeck: null,
        deck: t.deck ?? null,
      },
    }));
  }, [tournaments]);

  return (
    <div className="flex flex-col gap-4 lg:col-span-4 xl:col-span-3 border rounded-md pb-4 mb-4 overflow-auto max-h-[calc(100vh-150px)]">
      <div className="flex items-center justify-between border-b p-2 px-4">
        <h4 className="font-semibold mb-0!">Week Tournaments</h4>
      </div>
      <TournamentOverviewTable rows={rows} />
    </div>
  );
};

export default PQSelectedWeekTournaments;
