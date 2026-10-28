import { Link } from '@tanstack/react-router';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import { Button } from '@/components/ui/button.tsx';
import { AlbumHeader } from '@/components/app/user-albums/AlbumHeader.tsx';
import { albumTheme } from '@/components/app/user-albums/albumStyles.ts';
import { CreateTournamentAlbumButton } from './CreateTournamentAlbumButton.tsx';
import { TournamentAlbumBrowser } from './TournamentAlbumBrowser.tsx';

export function TournamentPhotos({
  tournamentId,
  selectedAlbumId,
  onSelectAlbum,
}: {
  tournamentId: string;
  selectedAlbumId?: string;
  onSelectAlbum: (id: string, replace?: boolean) => void;
}) {
  const canModerate = usePermissions()('admin', 'access');
  const tournamentQuery = useGetTournament(tournamentId);
  const tournament = tournamentQuery.data?.tournament;
  if (!tournament) {
    return tournamentQuery.isError ? (
      <div role="alert" className="space-y-3 rounded-xl border p-5">
        <p>Could not load this tournament.</p>
        <Button variant="outline" onClick={() => void tournamentQuery.refetch()}>
          Try again
        </Button>
      </div>
    ) : (
      <p role="status">Loading tournament…</p>
    );
  }
  return (
    <section
      aria-label="Event albums"
      tabIndex={-1}
      data-album-moderation-focus
      className={`${albumTheme} @container/event-photos space-y-6 py-3`}
    >
      <AlbumHeader
        compact
        eyebrow="Through the community’s lens"
        title="Event photos"
        description="The tables, the people, the moments between rounds. Explore albums from this event, or share your own."
        actions={
          <CreateTournamentAlbumButton
            tournamentId={tournamentId}
            tournamentName={tournament.name}
          />
        }
      />
      {canModerate && (
        <Link
          to="/admin"
          search={{ page: 'album-moderation' }}
          className="inline-block text-sm underline underline-offset-4"
        >
          Manage blocked albums
        </Link>
      )}
      <TournamentAlbumBrowser
        tournamentId={tournamentId}
        selectedAlbumId={selectedAlbumId}
        onSelectAlbum={onSelectAlbum}
      />
    </section>
  );
}
