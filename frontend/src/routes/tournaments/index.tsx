import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { useState } from 'react';
import NewTournamentDialog from '@/components/app/dialogs/NewTournamentDialog.tsx';
import TournamentList from '@/components/app/tournaments/TournamentList/TournamentList.tsx';
import TournamentFilters, {
  TournamentFilterValues,
} from '@/components/app/tournaments/TournamentFilters/TournamentFilters.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/tournaments/')({
  component: TournamentsPage,
});

function TournamentsPage() {
  const hasPermission = usePermissions();
  const [filters, setFilters] = useState<TournamentFilterValues>({});

  const canCreate = hasPermission('tournament', 'create');

  return (
    <>
      <Helmet title="Tournaments | SWUBase" />
      <div className="p-2">
        <div className="flex flex-row gap-4 items-center justify-between mb-4">
          <h3>Tournaments</h3>
          {canCreate && <NewTournamentDialog trigger={<Button>New Tournament</Button>} />}
        </div>

        <TournamentFilters onApplyFilters={setFilters} />
        <TournamentList filters={filters} />
      </div>
    </>
  );
}
