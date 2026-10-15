import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import { TournamentPhotos } from '@/components/app/tournaments/TournamentPhotos.tsx';

export const Route = createFileRoute('/tournaments/$tournamentId/photos')({
  component: TournamentPhotosPage,
});

function TournamentPhotosPage() {
  const { tournamentId } = Route.useParams();
  return (
    <TournamentDetail tournamentId={tournamentId} activeTab="photos" showDataNotice={false}>
      <TournamentPhotos tournamentId={tournamentId} />
    </TournamentDetail>
  );
}
