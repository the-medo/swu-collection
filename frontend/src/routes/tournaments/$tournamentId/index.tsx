import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';

export const Route = createFileRoute('/tournaments/$tournamentId/')({
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const { tournamentId } = Route.useParams();

  return <TournamentDetail tournamentId={tournamentId} />;
}
