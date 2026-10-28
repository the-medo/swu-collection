import { useEffect, useRef, useState } from 'react';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import { Images, Maximize2 } from 'lucide-react';
import type { TournamentAlbum } from '../../../../../types/UserAlbum.ts';
import { useUserAlbum } from '@/api/user-albums/useUserAlbum.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { useInfiniteQueryScroll } from '@/hooks/useInfiniteQueryScroll.ts';
import { useAlbumLoadMore } from '@/components/app/user-albums/useAlbumLoadMore.ts';
import { AlbumPhotoViewer } from '@/components/app/user-albums/AlbumPhotoViewer.tsx';
import { AlbumModerationAction } from '@/components/app/user-albums/AlbumModerationAction.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';

export function TournamentAlbumPhotos({
  album,
  tournamentId,
  onRefreshAlbums,
  compact = false,
}: {
  album: TournamentAlbum;
  tournamentId: string;
  onRefreshAlbums: () => Promise<unknown>;
  compact?: boolean;
}) {
  const query = useUserAlbum(album.id);
  const data = query.data?.pages[0];
  const images = query.data?.pages.flatMap(page => page.images) ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const navigation = useRef(0);
  const navigationPending = useRef(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const index = images.findIndex(image => image.fileId === selectedId);
  const image = images[index];
  const { containerRef, loadMore } = useAlbumLoadMore(
    images.length,
    query.isFetching,
    query.fetchNextPage,
  );
  const unavailable =
    albumAccessLost(query.error) ||
    (data && (data.album.tournamentId !== tournamentId || data.album.visibility !== 'public'));
  const { observerTarget } = useInfiniteQueryScroll({
    fetchNextPage: query.fetchNextPage,
    hasNextPage: !!query.hasNextPage && !query.isError && !unavailable && !selectedId,
    isFetchingNextPage: query.isFetching,
    isLoading: query.isPending,
  });

  useEffect(
    () => () => {
      navigation.current++;
    },
    [],
  );
  useEffect(() => {
    if (selectedId && (unavailable || (data && !image))) {
      navigation.current++;
      setSelectedId(null);
    }
  }, [selectedId, data, image, unavailable]);

  const next = async () => {
    if (!image || navigationPending.current) return;
    if (index < images.length - 1) {
      setSelectedId(images[index + 1].fileId);
    } else if (!query.hasNextPage) {
      setSelectedId(images[0].fileId);
    } else if (!query.isFetching) {
      const request = ++navigation.current;
      navigationPending.current = true;
      setAdvancing(true);
      try {
        const result = await query.fetchNextPage();
        if (request !== navigation.current || result.isError) return;
        const loaded = result.data?.pages.flatMap(page => page.images) ?? [];
        const currentIndex = loaded.findIndex(item => item.fileId === image.fileId);
        const nextImage = loaded[currentIndex + 1] ?? (!result.hasNextPage ? loaded[0] : undefined);
        if (nextImage) setSelectedId(nextImage.fileId);
      } finally {
        navigationPending.current = false;
        setAdvancing(false);
      }
    }
  };

  if (unavailable)
    return (
      <div role="alert" className="space-y-3 rounded-xl border p-5 text-sm">
        <p>This album is no longer available in this event.</p>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
            void onRefreshAlbums();
          }}
        >
          Refresh event albums
        </Button>
      </div>
    );
  if (!data && query.isPending)
    return (
      <div role="status" className="space-y-5">
        <span className="sr-only">Loading photos…</span>
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map(item => (
            <Skeleton key={item} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </div>
    );
  return (
    <section
      aria-label={`${album.title} photos`}
      className={cn('@container/album-gallery', compact ? 'space-y-3' : 'space-y-5')}
    >
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-4',
          !compact && 'border-b border-border/70 pb-4',
        )}
      >
        <div className="min-w-0 flex-1 basis-64 space-y-2">
          <div className={compact ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'space-y-2'}>
            <h3
              ref={heading}
              tabIndex={-1}
              className={cn(
                'm-0! min-w-0 break-words border-0! p-0! font-semibold!',
                compact ? 'text-xs!' : 'text-xl! tracking-tight!',
              )}
            >
              {data?.album.title ?? album.title}
            </h3>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <UserDisplay user={data?.owner ?? album.owner} />
              <span className="flex shrink-0 items-center gap-1.5">
                <Images className="size-3.5" /> {data?.album.imageCount ?? album.imageCount}{' '}
                {(data?.album.imageCount ?? album.imageCount) === 1 ? 'photo' : 'photos'}
              </span>
            </div>
          </div>
          {(data?.album.description ?? album.description) && (
            <p className="max-w-3xl whitespace-pre-wrap break-words text-xs leading-relaxed! text-muted-foreground">
              {data?.album.description ?? album.description}
            </p>
          )}
        </div>
        <AlbumModerationAction album={data?.album ?? album} block />
      </div>
      {query.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"
        >
          <p className="text-destructive">{query.error.message}</p>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => {
              heading.current?.focus({ preventScroll: true });
              void query.refetch();
            }}
          >
            Reload album
          </Button>
        </div>
      )}
      {data && !images.length && (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          There are no photos in this album yet.
        </p>
      )}
      <div
        ref={containerRef}
        className="grid grid-cols-2 gap-2 @xl/album-gallery:grid-cols-3 @4xl/album-gallery:grid-cols-4 sm:gap-3"
      >
        {images.map((item, itemIndex) => (
          <button
            type="button"
            key={item.fileId}
            data-album-item
            aria-label={`View image ${itemIndex + 1}${item.caption ? `: ${item.caption}` : ''}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={event => {
              opener.current = event.currentTarget;
              setSelectedId(item.fileId);
            }}
          >
            <img
              src={item.thumbnailUrl}
              alt={item.altText}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transform-none"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-2 right-2 rounded-full bg-black/55 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <Maximize2 className="size-4" />
            </span>
          </button>
        ))}
      </div>
      {query.hasNextPage && (
        <div ref={observerTarget} className="flex justify-center py-3">
          <Button variant="ghost" disabled={query.isFetching} onClick={() => void loadMore()}>
            {query.isFetching ? 'Loading photos…' : 'Load more photos'}
          </Button>
        </div>
      )}
      {image && data && (
        <AlbumPhotoViewer
          title={data.album.title}
          image={image}
          index={index}
          total={data.album.imageCount}
          busy={
            advancing || (index === images.length - 1 && !!query.hasNextPage && query.isFetching)
          }
          previousDisabled={index === 0}
          onPrevious={() => {
            if (index > 0) setSelectedId(images[index - 1].fileId);
          }}
          onNext={() => void next()}
          onClose={() => {
            navigation.current++;
            setSelectedId(null);
          }}
          error={query.error?.message}
          onReload={() => void query.refetch()}
          reloading={query.isFetching}
          opener={opener}
          fallback={heading}
        />
      )}
    </section>
  );
}
