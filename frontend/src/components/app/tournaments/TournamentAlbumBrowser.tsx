import { useEffect, useId, useRef } from 'react';
import { Check, Images } from 'lucide-react';
import { useTournamentAlbums } from '@/api/user-albums/useTournamentAlbums.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { useAlbumLoadMore } from '@/components/app/user-albums/useAlbumLoadMore.ts';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { TournamentAlbumPhotos } from './TournamentAlbumPhotos.tsx';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';

export function TournamentAlbumBrowser({
  tournamentId,
  selectedAlbumId,
  onSelectAlbum,
  compact = false,
}: {
  tournamentId: string;
  selectedAlbumId?: string;
  onSelectAlbum: (id: string, replace?: boolean) => void;
  compact?: boolean;
}) {
  const query = useTournamentAlbums(tournamentId);
  const { hasNextPage, isFetching, isError, fetchNextPage } = query;
  const albums = albumAccessLost(query.error)
    ? []
    : (query.data?.pages.flatMap(page => page.albums) ?? []);
  const newestId = albums[0]?.id;
  const selectedId = selectedAlbumId ?? newestId;
  const selectedAlbum = albums.find(album => album.id === selectedId);
  const panelId = useId();
  const browser = useRef<HTMLDivElement>(null);
  const activeButton = useRef<HTMLButtonElement>(null);
  const { containerRef, loadMore } = useAlbumLoadMore(
    albums.length,
    query.isFetching,
    query.fetchNextPage,
    '[data-event-album]',
  );

  useEffect(() => {
    if (!selectedAlbumId && newestId && !isFetching) onSelectAlbum(newestId, true);
  }, [selectedAlbumId, newestId, isFetching, onSelectAlbum]);

  // A bookmarked album can be beyond the first page. Resolve it against the event's
  // public album list before reading its photos, including after moderation changes.
  useEffect(() => {
    if (selectedId && !selectedAlbum && hasNextPage && !isFetching && !isError) {
      void fetchNextPage();
    }
  }, [selectedId, selectedAlbum, hasNextPage, isFetching, isError, fetchNextPage]);

  useEffect(() => {
    const strip = containerRef.current;
    const button = activeButton.current;
    if (!strip || !button) return;
    const bounds = strip.getBoundingClientRect();
    const item = button.getBoundingClientRect();
    // Scroll only the horizontal strip; never move the page or the containing dialog.
    if (item.left < bounds.left || item.right > bounds.right) {
      // Align with the card's snap point so snapping cannot leave it half clipped.
      strip.scrollLeft += item.left - bounds.left - 4;
    }
  }, [selectedAlbum?.id, containerRef]);

  return (
    <div
      ref={browser}
      className={cn('min-w-0', compact ? 'space-y-2' : 'space-y-6')}
      tabIndex={-1}
      data-album-moderation-focus
    >
      {query.isPending && (
        <div role="status" className="flex gap-3 overflow-hidden">
          <span className="sr-only">Loading albums…</span>
          {[0, 1, 2].map(item => (
            <Skeleton key={item} className="h-40 w-48 shrink-0 rounded-xl" />
          ))}
        </div>
      )}
      {query.isError && (
        <div role="alert" className="space-y-3 rounded-2xl border p-5">
          <p className="text-sm text-destructive">{query.error.message}</p>
          <Button
            variant="outline"
            onClick={() => {
              browser.current?.focus({ preventScroll: true });
              void query.refetch();
            }}
          >
            Retry event photos
          </Button>
        </div>
      )}
      {query.isSuccess && !albums.length && (
        <div className="rounded-[20px] border border-dashed border-[var(--album-border)] bg-[var(--album-tint)] px-6 py-12 text-center">
          <span className="mx-auto mb-5 flex size-16 -rotate-6 items-center justify-center rounded-2xl border border-[var(--album-border)] bg-card">
            <Images className="size-7 text-[var(--album-accent)]" strokeWidth={1.2} />
          </span>
          <h3 className="m-0! border-0! p-0! text-lg! font-semibold!">No photos yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create the first album and share your view of the event.
          </p>
        </div>
      )}
      {!!albums.length && (
        <section
          aria-label="Choose an event album"
          className={cn('min-w-0', compact ? 'space-y-2' : 'space-y-3')}
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <h3 className="m-0! flex items-center gap-2 border-0! p-0! text-xs! font-semibold!">
              <Images className="size-4 text-[var(--album-accent)]" /> Albums
            </h3>
            <span className="text-muted-foreground">Newest first</span>
          </div>
          <div
            ref={containerRef}
            className={cn(
              'flex snap-x gap-3 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:thin] [scrollbar-color:var(--album-border)_transparent]',
              compact ? 'pb-2' : 'pb-3',
            )}
          >
            {albums.map(album => (
              <div
                key={album.id}
                className={cn(
                  'group w-48 shrink-0 snap-start overflow-hidden rounded-xl border transition-colors',
                  album.id === selectedId
                    ? 'border-[var(--album-accent)] bg-[var(--album-tint)] ring-1 ring-[var(--album-accent)]'
                    : 'border-border bg-card hover:border-[var(--album-accent)]/60',
                )}
              >
                <button
                  ref={album.id === selectedId ? activeButton : undefined}
                  type="button"
                  data-event-album
                  aria-label={`View album: ${album.title}`}
                  aria-pressed={album.id === selectedId}
                  aria-controls={panelId}
                  onClick={() => onSelectAlbum(album.id)}
                  className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div className="relative h-24 overflow-hidden bg-muted">
                    {album.cover ? (
                      <img
                        src={album.cover.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                      />
                    ) : (
                      <Images className="mx-auto h-full w-7 text-muted-foreground" />
                    )}
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white">
                      {album.imageCount} {album.imageCount === 1 ? 'photo' : 'photos'}
                    </span>
                    {album.id === selectedId && (
                      <span
                        aria-hidden="true"
                        className="absolute right-2 top-2 rounded-full bg-[#dce7a0] p-1 text-[#17352e]"
                      >
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="px-3 pb-1 pt-2.5">
                    <span className="block truncate text-xs font-semibold" title={album.title}>
                      {album.title}
                    </span>
                  </div>
                </button>
                <div className="px-2.5 pb-2">
                  <UserDisplay
                    user={album.owner}
                    className="py-0 text-[11px] text-muted-foreground [&>span:last-child]:truncate"
                  />
                </div>
              </div>
            ))}
            {query.hasNextPage && (
              <div className="flex shrink-0 items-center px-2">
                <Button
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => void loadMore()}
                >
                  {query.isFetching ? 'Loading…' : 'More albums'}
                </Button>
              </div>
            )}
          </div>
        </section>
      )}
      <div id={panelId}>
        {selectedAlbum ? (
          <TournamentAlbumPhotos
            key={selectedAlbum.id}
            album={selectedAlbum}
            tournamentId={tournamentId}
            compact={compact}
            onRefreshAlbums={() => {
              browser.current?.focus({ preventScroll: true });
              return query.refetch();
            }}
          />
        ) : selectedId && albums.length > 0 && !albumAccessLost(query.error) ? (
          query.isFetching || (query.hasNextPage && !query.isError) ? (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">
              Finding your album…
            </p>
          ) : (
            !query.isError && (
              <div role="status" className="space-y-3 rounded-xl border p-5 text-sm">
                <p>This album is no longer available in this event.</p>
                {newestId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      browser.current?.focus({ preventScroll: true });
                      onSelectAlbum(newestId, true);
                    }}
                  >
                    View newest album
                  </Button>
                )}
              </div>
            )
          )
        ) : null}
      </div>
    </div>
  );
}
