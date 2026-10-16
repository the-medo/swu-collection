import { Link } from '@tanstack/react-router';
import { useBlockedEventAlbums } from '@/api/user-albums/useBlockedEventAlbums.ts';
import { AlbumModerationAction } from '../user-albums/AlbumModerationAction.tsx';
import { Button } from '@/components/ui/button.tsx';

export function AlbumModerationPage() {
  const query = useBlockedEventAlbums();
  const albums = query.data?.pages.flatMap(page => page.albums) ?? [];
  return (
    <section aria-label="Album moderation" className="space-y-5">
      <div>
        <h3 tabIndex={-1} data-album-moderation-focus>
          Album moderation
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Albums removed from events stay blocked until an admin restores event linking. Remove an
          album using its controls on a tournament’s Event photos page.
        </p>
      </div>
      {query.isPending && <p role="status">Loading blocked albums…</p>}
      {query.isError && (
        <div role="alert" className="space-y-2">
          <p className="text-destructive">{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {query.isSuccess && !albums.length && (
        <p className="py-6 text-muted-foreground">No albums are blocked from events.</p>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {albums.map(album => (
          <article key={album.id} className="flex min-w-0 flex-col gap-3 rounded-xl border p-5">
            <h4 className="break-words font-semibold">{album.title}</h4>
            <Link
              to="/users/$userId"
              params={{ userId: album.owner.id }}
              className="truncate text-sm text-muted-foreground underline"
            >
              {album.owner.displayName}
            </Link>
            <AlbumModerationAction album={album} block={false} />
          </article>
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetching ? 'Loading…' : 'Load more blocked albums'}
        </Button>
      )}
    </section>
  );
}
