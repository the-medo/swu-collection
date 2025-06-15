import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import { CardStatsTab } from '@/components/app/tournaments/TournamentTabs';

export const Route = createFileRoute('/tournaments/$tournamentId/card-stats')({
  component: TournamentCardStatsPage,
});

function TournamentCardStatsPage() {
  const { tournamentId } = Route.useParams();

  return (
    <TournamentDetail tournamentId={tournamentId} activeTab="card-stats">
      <CardStatsTab tournamentId={tournamentId} route={Route} />
    </TournamentDetail>
  );
}
