import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import React, { useState } from 'react';
import NewTournamentDialog from '@/components/app/dialogs/NewTournamentDialog.tsx';
import TournamentList from '@/components/app/tournaments/TournamentList/TournamentList.tsx';
import TournamentFilters, {
  TournamentFilterValues,
} from '@/components/app/tournaments/TournamentFilters/TournamentFilters.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Helmet } from 'react-helmet-async';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation';

export const Route = createFileRoute('/tournaments/all/')({
  component: TournamentsAllPage,
});

function TournamentsAllPage() {
  const hasPermission = usePermissions();
  const [filters, setFilters] = useState<TournamentFilterValues>({});
  const canCreate = hasPermission('tournament', 'create');

  return (
    <>
      <Helmet title="All Tournaments | SWUBase" />
      <div className="p-2">
        <div className="flex flex-row flex-wrap gap-4 items-center justify-between mb-4">
          <h3 className="mb-0">Tournaments</h3>
          {canCreate && <NewTournamentDialog trigger={<Button>New Tournament</Button>} />}
        </div>

        <TournamentNavigation />

        <TournamentFilters onApplyFilters={setFilters} />
        <TournamentList filters={filters} />
      </div>
    </>
  );
}