import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import React from 'react';
import NewTournamentDialog from '@/components/app/dialogs/NewTournamentDialog.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Helmet } from 'react-helmet-async';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation';

export const Route = createFileRoute('/tournaments/planetary-qualifiers/')({
  component: TournamentsPlanetaryQualifiersPage,
});

function TournamentsPlanetaryQualifiersPage() {
  const hasPermission = usePermissions();
  const canCreate = hasPermission('tournament', 'create');

  return (
    <>
      <Helmet title="Planetary Qualifiers | SWUBase" />
      <div className="p-2">
        <div className="flex flex-row flex-wrap gap-4 items-center justify-between mb-4">
          <h3 className="mb-0">Tournaments</h3>
          {canCreate && <NewTournamentDialog trigger={<Button>New Tournament</Button>} />}
        </div>

        <TournamentNavigation />

        <div className="p-8 text-center text-gray-500">
          <p>Planetary Qualifiers content coming soon.</p>
        </div>
      </div>
    </>
  );
}