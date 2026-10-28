import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import { TournamentCommunityContent } from '@/components/app/tournaments/TournamentCommunityContent.tsx';

export const Route = createFileRoute('/tournaments/$tournamentId/community-content')({
  head: () => ({ meta: [{ title: 'Community content | SWUBase' }] }),
  component: TournamentCommunityPage,
});

function TournamentCommunityPage() {
  const { tournamentId } = Route.useParams();
  return (
    <TournamentDetail
      tournamentId={tournamentId}
      activeTab="community-content"
      showDataNotice={false}
    >
      <TournamentCommunityContent key={tournamentId} tournamentId={tournamentId} />
    </TournamentDetail>
  );
}
