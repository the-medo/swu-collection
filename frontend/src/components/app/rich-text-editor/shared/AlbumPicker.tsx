import { useState } from 'react';
import { Check, ExternalLink, Globe, Images, Link, LockKeyhole, Search } from 'lucide-react';
import { useUserAlbums } from '@/api/user-albums/useUserAlbums.ts';
import { useUserAlbum } from '@/api/user-albums/useUserAlbum.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useSession } from '@/lib/auth-client.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { albumTheme } from '@/components/app/user-albums/albumStyles.ts';
import { cn } from '@/lib/utils.ts';
import { AlbumPreview } from './AlbumPreview.tsx';
import { PickerBody, PickerFooter, PickerNotice } from './PickerLayout.tsx';

const visibilityIcons = { public: Globe, unlisted: Link, private: LockKeyhole };

export function AlbumPicker({
  initialId,
  onSelect,
}: {
  initialId?: string;
  onSelect: (id: string) => void;
}) {
  const user = useUser();
  const session = useSession();
  const albums = useUserAlbums(user?.id ?? '');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(initialId);
  const selected = useUserAlbum(user ? (selectedId ?? '') : '');
  const data =
    !selected.isError && selected.data?.pages[0].album.userId === user?.id
      ? selected.data?.pages[0]
      : undefined;
  const loaded = albums.data?.pages.flatMap(page => page.albums) ?? [];
  const matching = loaded.filter(album =>
    `${album.title} ${album.description}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  const hint =
    data?.album.visibility === 'private'
      ? 'Only you can see this private album. Change its visibility in Albums to share it with readers.'
      : data?.album.visibility === 'unlisted'
        ? 'Readers of your article will be able to open this unlisted album.'
        : 'The first four photos appear in your article. Readers can open the full album in a new tab.';
  return (
    <>
      <PickerBody className={albumTheme}>
        {session.isPending ? (
          <PickerNotice loading title="Loading your albums…" />
        ) : !user ? (
          <PickerNotice icon={Images} title="Sign in to choose one of your albums" />
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="rte-album-search" className="text-xs font-medium">
                Your albums
              </label>
              <Input
                id="rte-album-search"
                icon={Search}
                placeholder="Find an album…"
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="h-10 rounded-xl"
              />
              {albums.hasNextPage && (
                <p className="text-xs text-muted-foreground">
                  Searches {loaded.length} loaded albums. Load more to include older albums.
                </p>
              )}
            </div>
            {albums.isPending ? (
              <PickerNotice loading title="Loading your albums…" />
            ) : albums.isError ? (
              <PickerNotice error title="Could not load your albums">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={albums.isFetching}
                  onClick={() => void albums.refetch()}
                >
                  Try again
                </Button>
              </PickerNotice>
            ) : !loaded.length ? (
              <PickerNotice icon={Images} title="Your stories deserve a photo album">
                <p>Create an album and add photos, then come back to share it in your article.</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <a
                    href="/settings?page=uploads&uploadView=albums"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    My albums <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </PickerNotice>
            ) : (
              <>
                {!matching.length && (
                  <PickerNotice title="No matching albums">
                    Try another name{albums.hasNextPage ? ' or load more albums' : ''}.
                  </PickerNotice>
                )}
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  aria-label="Your album choices"
                >
                  {matching.map(album => {
                    const VisibilityIcon = visibilityIcons[album.visibility];
                    return (
                      <button
                        key={album.id}
                        type="button"
                        aria-label={`Choose album: ${album.title}`}
                        aria-pressed={selectedId === album.id}
                        onClick={() => setSelectedId(album.id)}
                        className={cn(
                          'group flex min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selectedId === album.id
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
                        )}
                      >
                        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--album-tint)] text-[var(--album-accent)]">
                          {album.cover ? (
                            <img
                              src={album.cover.thumbnailUrl}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          ) : (
                            <Images className="size-6" strokeWidth={1.3} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 space-y-1.5">
                          <span className="line-clamp-2 block text-sm font-medium leading-snug [overflow-wrap:anywhere]">
                            {album.title}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                            <span>
                              {album.imageCount} {album.imageCount === 1 ? 'photo' : 'photos'}
                            </span>
                            <span className="inline-flex items-center gap-1 capitalize">
                              <VisibilityIcon className="size-3" aria-hidden />
                              {album.visibility}
                            </span>
                          </span>
                        </span>
                        <span
                          className={cn(
                            'grid size-5 shrink-0 place-items-center rounded-full border',
                            selectedId === album.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-transparent',
                          )}
                        >
                          <Check className="size-3" aria-hidden />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {!albums.isError && albums.hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                disabled={albums.isFetching}
                onClick={() => void albums.fetchNextPage()}
              >
                {albums.isFetchingNextPage ? 'Loading…' : 'Load more albums'}
              </Button>
            )}
            {selectedId && (
              <div className="rounded-2xl border bg-card p-4">
                {selected.isPending ? (
                  <PickerNotice loading title="Loading album preview…" />
                ) : albumAccessLost(selected.error) ? (
                  <PickerNotice title="Album unavailable">
                    This album is private or no longer available. Choose another album above.
                  </PickerNotice>
                ) : selected.isError ? (
                  <PickerNotice error title="Could not load album preview">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selected.isFetching}
                      onClick={() => void selected.refetch()}
                    >
                      Try again
                    </Button>
                  </PickerNotice>
                ) : data ? (
                  <AlbumPreview data={data} />
                ) : (
                  <PickerNotice title="Choose one of your albums to replace this album" />
                )}
              </div>
            )}
          </>
        )}
      </PickerBody>
      <PickerFooter hint={data ? hint : 'Choose an album to preview its photos.'}>
        <Button
          type="button"
          disabled={!user || !data || selected.isFetching}
          onClick={() => {
            if (data && !selected.isFetching) onSelect(data.album.id);
          }}
        >
          <Images className="size-4" /> {initialId ? 'Update album' : 'Insert album'}
        </Button>
      </PickerFooter>
    </>
  );
}
