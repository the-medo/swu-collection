import { createFileRoute } from '@tanstack/react-router';
import TournamentDetail from '@/components/app/tournaments/TournamentDetail/TournamentDetail.tsx';
import { TournamentPhotos } from '@/components/app/tournaments/TournamentPhotos.tsx';
import { z } from 'zod';
import { useCallback } from 'react';

export const Route = createFileRoute('/tournaments/$tournamentId/photos')({
  validateSearch: z.object({ eventAlbum: z.string().uuid().optional().catch(undefined) }),
  component: TournamentPhotosPage,
});

function TournamentPhotosPage() {
  const { tournamentId } = Route.useParams();
  const { eventAlbum } = Route.useSearch();
  const navigate = Route.useNavigate();
  const selectAlbum = useCallback(
    (id: string, replace = false) => {
      void navigate({
        search: previous => ({ ...previous, eventAlbum: id }),
        replace,
        resetScroll: false,
      });
    },
    [navigate],
  );
  return (
    <TournamentDetail tournamentId={tournamentId} activeTab="photos" showDataNotice={false}>
      <TournamentPhotos
        tournamentId={tournamentId}
        selectedAlbumId={eventAlbum}
        onSelectAlbum={selectAlbum}
      />
    </TournamentDetail>
  );
}
