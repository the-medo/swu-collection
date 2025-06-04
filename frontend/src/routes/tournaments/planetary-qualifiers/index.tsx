import TournamentsPlanetaryQualifiers from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/TournamentsPlanetaryQualifiers';
import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/tournaments/planetary-qualifiers/')({
  component: TournamentsPlanetaryQualifiersPage,
});

function TournamentsPlanetaryQualifiersPage() {
  return (
    <>
      <Helmet title="Planetary Qualifiers | SWUBase" />
      <div className="p-2">
        <TournamentsPlanetaryQualifiers />
      </div>
    </>
  );
}
