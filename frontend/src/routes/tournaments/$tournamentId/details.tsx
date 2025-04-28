import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import { DetailAndBracketTab } from '@/components/app/tournaments/TournamentTabs';

export const Route = createFileRoute('/tournaments/$tournamentId/details')({
  component: TournamentDetailsPage,
});

function TournamentDetailsPage() {
  const { tournamentId } = Route.useParams();

  return (
    <TournamentDetail tournamentId={tournamentId} activeTab="details">
      <DetailAndBracketTab tournamentId={tournamentId} />
    </TournamentDetail>
  );
}
