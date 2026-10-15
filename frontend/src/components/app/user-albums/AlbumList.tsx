import { useAlbumLoadMore } from './useAlbumLoadMore.ts';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Images, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useUserAlbums } from '@/api/user-albums/useUserAlbums.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { useUser } from '@/hooks/useUser.ts';
import { AlbumForm } from './AlbumForm.tsx';
import { AlbumCopyLinkButton } from './AlbumCopyLinkButton.tsx';
import { AlbumPrivacyControl } from './AlbumPrivacyControl.tsx';
import { albumTheme } from './albumStyles.ts';

export function AlbumList({ userId, onEdit }: { userId: string; onEdit?: (id: string) => void }) {
  const user = useUser();
  const query = useUserAlbums(userId, !onEdit);
  const [creating, setCreating] = useState(false);
  const albums = query.data?.pages.flatMap(page => page.albums) ?? [];
  const { containerRef, loadMore } = useAlbumLoadMore(albums.length, query.isFetching, () =>
    query.fetchNextPage(),
  );
  return (
    <section
      className={`${albumTheme} @container/albums min-w-0 space-y-6`}
      aria-label={onEdit ? 'My albums' : 'Public albums'}
    >
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6 pt-2">
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--album-accent)]">
            <Images className="size-4" /> {onEdit ? 'Your image library' : 'From the community'}
          </p>
          <h2 className="m-0! border-0! p-0! text-[30px]! font-semibold! leading-tight! tracking-[-0.04em]! sm:text-[36px]!">
            {onEdit ? 'My albums' : 'Albums'}
          </h2>
        </div>
        {onEdit ? (
          <Button
            className="rounded-xl bg-[#17352e] text-[#fffaf0] shadow-none hover:bg-[#326149] dark:bg-[#dce7a0] dark:text-[#17352e] dark:hover:bg-[#edf3c5]"
            onClick={() => setCreating(true)}
          >
            <Plus /> Create album
          </Button>
        ) : user?.id === userId ? (
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/settings" search={{ page: 'uploads', uploadView: 'albums' }}>
              Manage albums <ArrowRight />
            </Link>
          </Button>
        ) : null}
      </header>
      {query.isPending && <p role="status">Loading albums…</p>}
      {query.isError && (
        <div role="alert" className="space-y-3 rounded-2xl border p-4">
          <p className="text-destructive">{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {query.isSuccess && !albums.length && (
        <div className="rounded-[20px] border border-dashed border-[var(--album-border)] bg-[var(--album-tint)] px-5 py-16 text-center text-sm text-muted-foreground">
          <div className="mx-auto mb-6 flex size-20 -rotate-6 items-center justify-center rounded-2xl border border-[var(--album-border)] bg-card shadow-sm">
            <Images className="size-9 text-[var(--album-accent)]" strokeWidth={1.2} />
          </div>
          {onEdit ? 'Create your first album to collect your images.' : 'No public albums yet.'}
        </div>
      )}
      {!albumAccessLost(query.error) && (
        <div
          ref={containerRef}
          className="grid grid-cols-1 gap-6 @xl/albums:grid-cols-2 @5xl/albums:grid-cols-3"
        >
          {albums.map(album => (
            <article
              key={album.id}
              className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <Link
                data-album-item
                to="/albums/$albumId"
                params={{ albumId: album.id }}
                className="relative isolate flex aspect-[16/10] flex-col justify-end overflow-hidden bg-[#17352e] p-5 text-[#fffaf0] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#dce7a0] sm:p-6"
              >
                {album.cover ? (
                  <img
                    className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none"
                    loading="lazy"
                    src={album.cover.thumbnailUrl}
                    alt={album.cover.altText}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-20 overflow-hidden bg-gradient-to-br from-[#326149] via-[#234c3d] to-[#17352e]"
                  >
                    <div className="absolute -right-4 -top-9 size-48 rotate-[18deg] rounded-3xl border border-[#dce7a0]/20 bg-white/5" />
                    <div className="absolute right-8 top-3 flex size-40 -rotate-12 items-center justify-center rounded-2xl border border-[#dce7a0]/20 bg-[#dce7a0]/5">
                      <Images className="size-16 text-[#dce7a0]/30" strokeWidth={0.8} />
                    </div>
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0c2019]/95 via-[#0c2019]/25 to-transparent"
                />
                <span className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0c2019]/60 px-2.5 py-1 text-[10px] font-medium backdrop-blur-sm sm:left-6 sm:top-6">
                  <Images className="size-3" /> {album.imageCount}{' '}
                  {album.imageCount === 1 ? 'image' : 'images'}
                </span>
                <div className="flex items-end justify-between gap-4">
                  <h3 className="m-0! min-w-0 border-0! p-0! text-[24px]! font-semibold! leading-tight! tracking-[-0.025em]! [overflow-wrap:anywhere]">
                    {album.title}
                  </h3>
                  <ArrowRight
                    aria-hidden="true"
                    className="mb-1 size-5 shrink-0 text-[#dce7a0] transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                  />
                </div>
              </Link>
              <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                {album.description && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    {album.description}
                  </p>
                )}
                {onEdit && <AlbumPrivacyControl album={album} disabled={query.isFetching} />}
                <div className="mt-auto flex flex-wrap gap-2 border-t border-border/70 pt-4">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-w-32 flex-1 justify-between rounded-xl bg-[var(--album-tint)] text-xs text-[var(--album-accent)] hover:bg-[var(--album-tint)] hover:brightness-95"
                      aria-label={`Manage album: ${album.title}`}
                      onClick={() => onEdit(album.id)}
                    >
                      Manage album <ArrowRight />
                    </Button>
                  )}
                  <AlbumCopyLinkButton
                    id={album.id}
                    title={album.title}
                    isPrivate={album.visibility === 'private'}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {query.hasNextPage && (
        <Button variant="outline" disabled={query.isFetching} onClick={() => void loadMore()}>
          {query.isFetchingNextPage ? 'Loading…' : 'Load more albums'}
        </Button>
      )}
      {creating && onEdit && (
        <AlbumForm
          onClose={() => setCreating(false)}
          onSaved={id => {
            setCreating(false);
            onEdit(id);
          }}
        />
      )}
    </section>
  );
}
