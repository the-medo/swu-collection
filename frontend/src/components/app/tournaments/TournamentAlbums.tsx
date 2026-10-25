import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Images } from 'lucide-react';
import { useTournamentAlbums } from '@/api/user-albums/useTournamentAlbums.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { Button } from '@/components/ui/button.tsx';
import { albumTheme } from '@/components/app/user-albums/albumStyles.ts';
import { CreateTournamentAlbumButton } from './CreateTournamentAlbumButton.tsx';
import { TournamentAlbumCard } from './TournamentAlbumCard.tsx';

export function TournamentAlbums({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const query = useTournamentAlbums(tournamentId);
  const albums = albumAccessLost(query.error)
    ? []
    : (query.data?.pages.flatMap(page => page.albums).slice(0, 4) ?? []);
  return (
    <section
      aria-label="Event photos"
      className={`${albumTheme} flex min-w-0 flex-col gap-3 rounded-xl border border-[color:var(--album-border)] bg-card p-3`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0! flex items-center gap-2 border-0! p-0! text-sm! font-semibold!">
          <Images className="size-4 text-muted-foreground" /> Event photos
        </h2>
        <Link
          to="/tournaments/$tournamentId/photos"
          params={{ tournamentId }}
          aria-label="View all event albums"
          className="flex items-center gap-1 rounded-sm text-[11px] font-medium text-[var(--album-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      {query.isPending && (
        <p role="status" className="text-xs text-muted-foreground">
          Loading albums…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="space-y-1 text-xs">
          <p className="text-destructive">{query.error.message}</p>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => void query.refetch()}
          >
            Retry event photos
          </Button>
        </div>
      )}
      {query.isSuccess && !albums.length && (
        <div className="flex flex-1 flex-col justify-center py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">No photos yet</p>
          <p className="mt-1">Create an album and share your photos from this event.</p>
        </div>
      )}
      {!!albums.length && (
        <div className="grid grid-cols-2 gap-2">
          {albums.map(album => (
            <TournamentAlbumCard key={album.id} album={album} compact />
          ))}
        </div>
      )}
      <div className="mt-auto pt-1">
        <CreateTournamentAlbumButton
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          compact
        />
      </div>
    </section>
  );
}
