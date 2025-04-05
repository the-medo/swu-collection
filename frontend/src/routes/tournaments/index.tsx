import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { useState } from 'react';
import NewTournamentDialog from '@/components/app/dialogs/NewTournamentDialog.tsx';
import TournamentList from '@/components/app/tournaments/TournamentList/TournamentList.tsx';
import TournamentFilters, {
  TournamentFilterValues,
} from '@/components/app/tournaments/TournamentFilters/TournamentFilters.tsx';
import { useTournamentPermissions } from '@/hooks/useTournamentPermissions.ts';

export const Route = createFileRoute('/tournaments/')({
  component: TournamentsPage,
});

function TournamentsPage() {
  const { canCreate, loading } = useTournamentPermissions();
  const [filters, setFilters] = useState<TournamentFilterValues>({});

  return (
    <div className="p-2">
      <div className="flex flex-row gap-4 items-center justify-between mb-4">
        <h3>Tournaments</h3>
        {!loading && canCreate && <NewTournamentDialog trigger={<Button>New Tournament</Button>} />}
      </div>

      <TournamentFilters onApplyFilters={setFilters} />
      <TournamentList filters={filters} />
    </div>
  );
}
