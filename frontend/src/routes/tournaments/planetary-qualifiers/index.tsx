import TournamentsPlanetaryQualifiers from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/TournamentsPlanetaryQualifiers';
import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';

const searchParams = z.object({
  page: z.enum(['tournaments', 'champions', 'top8', 'total']).default('champions'),
  pqSideStatView: z.enum(['week', 'deckKey']).default('deckKey'),
  pqWtwDataViewType: z.enum(['count', 'percentage']).default('percentage'),
  pqWtwViewMode: z.enum(['chart', 'table']).default('chart'),
  weekId: z.string().optional(),
});

export const Route = createFileRoute('/tournaments/planetary-qualifiers/')({
  component: TournamentsPlanetaryQualifiersPage,
  validateSearch: zodValidator(searchParams),
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
