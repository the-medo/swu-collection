import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import { MetaAnalysisTab } from '@/components/app/tournaments/TournamentTabs';

export const Route = createFileRoute('/tournaments/$tournamentId/meta')({
  component: TournamentMetaPage,
});

function TournamentMetaPage() {
  const { tournamentId } = Route.useParams();

  return (
    <TournamentDetail tournamentId={tournamentId} activeTab="meta">
      <MetaAnalysisTab tournamentId={tournamentId} route={Route} />
    </TournamentDetail>
  );
}
