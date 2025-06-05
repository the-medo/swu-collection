import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import { AllDecksTab } from '@/components/app/tournaments/TournamentTabs';

export const Route = createFileRoute('/tournaments/$tournamentId/decks')({
  component: TournamentDecksPage,
});

function TournamentDecksPage() {
  const { tournamentId } = Route.useParams();

  return (
    <TournamentDetail tournamentId={tournamentId} activeTab="decks">
      <AllDecksTab />
    </TournamentDetail>
  );
}
