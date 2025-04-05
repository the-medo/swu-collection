import * as React from 'react';
import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useTournamentTableColumns } from './useTournamentTableColumns.tsx';
import { useGetTournaments } from '@/api/tournaments/useGetTournaments.ts';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';
import EditTournamentDialog from '@/components/app/dialogs/EditTournamentDialog.tsx';
import DeleteTournamentDialog from '@/components/app/dialogs/DeleteTournamentDialog.tsx';
import { Tournament } from '../../../../../../types/Tournament.ts';

interface TournamentListProps {
  filters?: {
    type?: string;
    season?: number;
    set?: string;
    format?: number;
    continent?: string;
  };
  sort?: string;
  order?: 'asc' | 'desc';
}

const TournamentList: React.FC<TournamentListProps> = ({
  filters = {},
  sort = 'tournament.date',
  order = 'desc',
}) => {
  // State for dialogs
  const [tournamentToEdit, setTournamentToEdit] = useState<Tournament | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);

  // Fetch tournaments data
  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useGetTournaments({
    ...filters,
    sort,
    order,
  });

  // Prepare table columns
  const columns = useTournamentTableColumns({
    onEdit: tournament => setTournamentToEdit(tournament),
    onDelete: tournament => setTournamentToDelete(tournament),
  });

  // Flatten data from all pages
  const tournaments = React.useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={tournaments} loading={isFetching && !isFetchingNextPage} />

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading more
              </>
            ) : (
              'Load more tournaments'
            )}
          </Button>
        </div>
      )}

      {/* Edit Tournament Dialog */}
      {tournamentToEdit && <EditTournamentDialog trigger={<></>} tournament={tournamentToEdit} />}

      {/* Delete Tournament Dialog */}
      {tournamentToDelete && (
        <DeleteTournamentDialog trigger={<></>} tournament={tournamentToDelete} />
      )}
    </div>
  );
};

export default TournamentList;
