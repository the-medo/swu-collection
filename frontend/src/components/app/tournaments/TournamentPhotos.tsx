import { Link } from '@tanstack/react-router';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Images } from 'lucide-react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import { useTournamentAlbums } from '@/api/user-albums/useTournamentAlbums.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { Button } from '@/components/ui/button.tsx';
import { AlbumHeader } from '@/components/app/user-albums/AlbumHeader.tsx';
import { albumTheme } from '@/components/app/user-albums/albumStyles.ts';
import { useAlbumLoadMore } from '@/components/app/user-albums/useAlbumLoadMore.ts';
import { CreateTournamentAlbumButton } from './CreateTournamentAlbumButton.tsx';
import { TournamentAlbumCard } from './TournamentAlbumCard.tsx';

export function TournamentPhotos({ tournamentId }: { tournamentId: string }) {
  const canModerate = usePermissions()('admin', 'access');
  const tournamentQuery = useGetTournament(tournamentId);
  const tournament = tournamentQuery.data?.tournament;
  const query = useTournamentAlbums(tournamentId);
  const albums = albumAccessLost(query.error)
    ? []
    : (query.data?.pages.flatMap(page => page.albums) ?? []);
  const { containerRef, loadMore } = useAlbumLoadMore(
    albums.length,
    query.isFetching,
    () => query.fetchNextPage(),
    '[data-event-album]',
  );
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
      {query.isPending && (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          Loading albums…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="space-y-3 rounded-2xl border p-5">
          <p className="text-destructive">{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry event photos
          </Button>
        </div>
      )}
      {query.isSuccess && !albums.length && (
        <div className="rounded-[20px] border border-dashed border-[var(--album-border)] bg-[var(--album-tint)] px-6 py-16 text-center">
          <span className="mx-auto mb-5 flex size-16 -rotate-6 items-center justify-center rounded-2xl border border-[var(--album-border)] bg-card">
            <Images className="size-7 text-[var(--album-accent)]" strokeWidth={1.2} />
          </span>
          <h3 className="m-0! border-0! p-0! text-lg! font-semibold!">No photos yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create the first album and share your view of the event.
          </p>
        </div>
      )}
      <div ref={containerRef} className="grid grid-cols-1 gap-6 @xl/event-photos:grid-cols-2">
        {albums.map(album => (
          <TournamentAlbumCard key={album.id} album={album} />
        ))}
      </div>
      {query.hasNextPage && !albumAccessLost(query.error) && (
        <div className="flex justify-center pb-4">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={query.isFetching}
            onClick={() => void loadMore()}
          >
            {query.isFetching ? 'Loading…' : 'Load more albums'}
          </Button>
        </div>
      )}
    </section>
  );
}
