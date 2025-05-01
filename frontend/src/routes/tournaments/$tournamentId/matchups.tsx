import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import { MatchupsTab } from '@/components/app/tournaments/TournamentTabs';

export const Route = createFileRoute('/tournaments/$tournamentId/matchups')({
  component: TournamentMatchupsPage,
});

function TournamentMatchupsPage() {
  const { tournamentId } = Route.useParams();

  return (
    <TournamentDetail tournamentId={tournamentId} activeTab="matchups">
      <MatchupsTab tournamentId={tournamentId} route={Route} />
    </TournamentDetail>
  );
}
