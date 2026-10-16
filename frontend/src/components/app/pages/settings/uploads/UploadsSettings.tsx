import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Images, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { getRouteApi, useBlocker } from '@tanstack/react-router';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.tsx';
import { AlbumList } from '@/components/app/user-albums/AlbumList.tsx';
import { AlbumEditor } from '@/components/app/user-albums/AlbumEditor.tsx';
import { UserStorageMeter } from '@/components/app/user-albums/UserStorageMeter.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { useInfiniteUserFiles } from '@/api/user-files/useInfiniteUserFiles.ts';
import { useUserImageUploadQueue } from '@/api/user-files/useUserImageUploadQueue.ts';
import { useInfiniteQueryScroll } from '@/hooks/useInfiniteQueryScroll.ts';
import type { UserFile } from '../../../../../../../types/UserFile.ts';
import { formatBytes } from './formatBytes.ts';
import { UserFileDetail } from './UserFileDetail.tsx';
import { UploadDropzone } from './UploadDropzone.tsx';

function UploadsLibrary({ userId, onBusy }: { userId: string; onBusy(busy: boolean): void }) {
  const [selected, setSelected] = useState<UserFile | null>(null);
  const queue = useUserImageUploadQueue(userId, onBusy);
  const { progress } = queue;
  const uploadButton = useRef<HTMLButtonElement>(null);
  const libraryButton = useRef<HTMLButtonElement | null>(null);
  const libraryGrid = useRef<HTMLDivElement>(null);
  const libraryHeading = useRef<HTMLHeadingElement>(null);
  const loadMoreButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const focusAfterLoad = useRef<{ index: number; source: Element; automatic: boolean } | null>(
    null,
  );
  const { toast } = useToast();
  const query = useInfiniteUserFiles(userId);
  const data = query.data?.pages[0];
  const files = useMemo(
    () => [
      ...new Map(
        query.data?.pages.flatMap(page => page.files).map(file => [file.id, file]),
      ).values(),
    ],
    [query.data],
  );
  const rememberLoadFocus = useCallback(
    (automatic = false) => {
      const source = document.activeElement;
      if (source && (source === loadMoreButton.current || source === retryButton.current))
        focusAfterLoad.current = { index: files.length, source, automatic };
    },
    [files.length],
  );
  const { fetchNextPage } = query;
  const loadMore = useCallback(() => {
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);
  const loadOnScroll = useCallback(() => {
    rememberLoadFocus(true);
    loadMore();
  }, [loadMore, rememberLoadFocus]);
  const { observerTarget } = useInfiniteQueryScroll({
    fetchNextPage: loadOnScroll,
    hasNextPage: query.hasNextPage && !query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isFetching || !!progress || !!selected,
  });
  useEffect(() => {
    if (query.isFetching || !focusAfterLoad.current) return;
    const { index, source, automatic } = focusAfterLoad.current;
    focusAfterLoad.current = null;
    if (document.activeElement !== source && document.activeElement !== document.body) return;
    // Automatic loading only restores focus if its control disappeared.
    if (automatic && source.isConnected) return;
    if (query.isError) retryButton.current?.focus();
    else {
      const nextImage = libraryGrid.current?.children[Math.min(index, files.length - 1)];
      if (nextImage instanceof HTMLElement) nextImage.focus();
      else libraryHeading.current?.focus();
    }
  }, [files, query.isFetching, query.isError]);
  const full = !!data && data.usedBytes >= data.quotaBytes;
  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    if (queue.isRunning()) {
      toast({
        title: 'Upload in progress',
        description: 'Wait for your current images to finish uploading.',
      });
      return;
    }
    if (!data?.uploadsEnabled || full) {
      toast({
        title: full ? 'Your storage is full' : 'Uploads are currently unavailable',
        description: full
          ? 'Delete an image to make room.'
          : 'Wait for your library to load or try again later.',
        variant: 'destructive',
      });
      return;
    }
    const result = await queue.run(files);
    if (result.status === 'complete') {
      toast({
        title: `${result.completed} ${result.completed === 1 ? 'image' : 'images'} uploaded`,
      });
    } else if (result.status === 'failed') {
      toast({
        title: 'Upload stopped',
        description: `${result.completed ? `${result.completed} uploaded. ` : ''}${result.error instanceof Error ? result.error.message : 'Please try again.'}`,
        variant: 'destructive',
      });
    }
  };
  return (
    <div className="min-w-0 space-y-4">
      <Card role="region" aria-labelledby="upload-heading" className="space-y-4 p-4">
        <div className="space-y-1">
          <h3 id="upload-heading">Upload</h3>
          <p className="text-sm text-muted-foreground">
            Add images for your avatars, headers and articles.
          </p>
        </div>
        <UploadDropzone
          disabled={!data?.uploadsEnabled || full || !!progress}
          progress={progress}
          buttonRef={uploadButton}
          onFiles={files => void uploadFiles(files)}
        />
        {!data && (
          <p role="status" className="text-sm text-muted-foreground">
            {query.isPending || query.isFetching
              ? 'Checking available storage…'
              : 'Uploads are unavailable until your library loads. Use Try again in All images below.'}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Images are resized and optimized automatically. Anyone with an image link can view it.
        </p>
        {data && (
          <>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  <strong>{formatBytes(data.usedBytes)}</strong> of {formatBytes(data.quotaBytes)}{' '}
                  used
                </span>
                <span className="text-muted-foreground">
                  {data.fileCount} {data.fileCount === 1 ? 'image' : 'images'}
                </span>
              </div>
              <progress
                aria-label="Image storage used"
                max={Math.max(data.quotaBytes, 1)}
                value={Math.min(data.usedBytes, data.quotaBytes)}
                className="block h-2 w-full overflow-hidden rounded-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Optimized images and thumbnails count toward your storage.
              </p>
              {full && (
                <p role="status" className="text-sm text-destructive">
                  Your storage is full. Delete an image to make room.
                </p>
              )}
            </div>
            {!data.uploadsEnabled && (
              <p role="status" className="text-sm text-muted-foreground">
                Image uploads are currently unavailable. Please try again later.
              </p>
            )}
          </>
        )}
      </Card>
      <Card role="region" aria-labelledby="library-heading" className="space-y-4 p-4">
        <div className="space-y-1">
          <h3 ref={libraryHeading} id="library-heading" tabIndex={-1}>
            All images
          </h3>
          <p className="text-sm text-muted-foreground">Your latest images, newest first.</p>
        </div>
        {!data && (query.isPending || query.isFetching) && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading your images…
          </p>
        )}
        {data &&
          (files.length ? (
            <div ref={libraryGrid} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {files.map(file => (
                <button
                  type="button"
                  key={file.id}
                  className="min-w-0 overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={event => {
                    libraryButton.current = event.currentTarget;
                    setSelected(file);
                  }}
                  aria-label={`View ${file.fileName}`}
                >
                  <img
                    src={file.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full bg-muted object-contain p-2"
                  />
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-medium">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.byteSize + file.thumbnailByteSize)} · {file.width} ×{' '}
                      {file.height}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-12 text-center">
              <Images className="size-9 text-muted-foreground" />
              <div>
                <p className="font-medium">Your image library starts here</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload an image to keep it ready for your next creation.
                </p>
              </div>
            </div>
          ))}
        {query.isError && (
          <div role="alert" className="space-y-2">
            <p className="text-sm text-destructive">{query.error.message}</p>
            <Button
              ref={retryButton}
              variant="outline"
              aria-disabled={query.isFetching || !!progress}
              className="aria-disabled:opacity-50"
              onClick={() => {
                if (query.isFetching || progress) return;
                rememberLoadFocus();
                if (query.isFetchNextPageError) loadMore();
                else void query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        )}
        <div ref={observerTarget} className="h-px" aria-hidden="true" />
        {data && files.length > 0 && (
          <div className="flex flex-col items-center gap-3">
            {query.isFetchingNextPage ? (
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading more images…
              </p>
            ) : (
              <p role="status" className="text-sm text-muted-foreground">
                {files.length} of {data.fileCount} images
              </p>
            )}
            {query.hasNextPage && !query.isError && (
              <Button
                ref={loadMoreButton}
                variant="outline"
                aria-disabled={query.isFetching || !!progress}
                className="aria-disabled:opacity-50"
                onClick={() => {
                  if (query.isFetching || progress) return;
                  rememberLoadFocus();
                  loadMore();
                }}
              >
                Load more images
              </Button>
            )}
          </div>
        )}
      </Card>
      {selected && (
        <UserFileDetail
          file={selected}
          uploading={!!progress}
          userId={userId}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            toast({ title: 'Image deleted' });
          }}
          returnFocus={() => {
            if (libraryButton.current?.isConnected) libraryButton.current.focus();
            else uploadButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}
const settingsRoute = getRouteApi('/_authenticated/settings/');
function UploadsNavigation({ userId }: { userId: string }) {
  const [uploading, setUploading] = useState(false);
  useBlocker({
    shouldBlockFn: () =>
      uploading &&
      !window.confirm(
        'Uploads are still running. Leave and stop the remaining uploads? Images already uploaded stay in All images.',
      ),
    enableBeforeUnload: uploading,
  });
  const search = settingsRoute.useSearch();
  const navigate = settingsRoute.useNavigate();
  const view = search.album ? 'albums' : (search.uploadView ?? 'images');
  const editAlbum = (id?: string) =>
    void navigate({
      search: previous => ({ ...previous, uploadView: 'albums', album: id }),
      resetScroll: false,
    });
  return (
    <Tabs
      value={view}
      onValueChange={value => {
        if (!uploading && (value === 'images' || value === 'albums'))
          void navigate({
            search: previous => ({
              ...previous,
              uploadView: value === 'images' ? undefined : value,
              album: undefined,
            }),
            resetScroll: false,
          });
      }}
    >
      <TabsList
        aria-label="Uploads views"
        className="mb-2 h-auto gap-1 rounded-2xl border bg-card p-1.5"
      >
        <TabsTrigger
          value="images"
          disabled={uploading}
          className="rounded-xl px-5 py-2.5 data-[state=active]:bg-[#f7f0dc] data-[state=active]:text-[#805e19] dark:data-[state=active]:bg-[#302a1b] dark:data-[state=active]:text-[#f1d48b]"
        >
          All images
        </TabsTrigger>
        <TabsTrigger
          value="albums"
          disabled={uploading}
          className="rounded-xl px-5 py-2.5 data-[state=active]:bg-[#f7f0dc] data-[state=active]:text-[#805e19] dark:data-[state=active]:bg-[#302a1b] dark:data-[state=active]:text-[#f1d48b]"
        >
          My albums
        </TabsTrigger>
      </TabsList>
      <TabsContent value="images">
        <UploadsLibrary userId={userId} onBusy={setUploading} />
      </TabsContent>
      <TabsContent value="albums" className="space-y-5">
        {search.album ? (
          <AlbumEditor
            key={search.album}
            id={search.album}
            userId={userId}
            onBack={() => editAlbum()}
            uploading={uploading}
            onUploadBusy={setUploading}
          />
        ) : (
          <AlbumList userId={userId} onEdit={editAlbum} />
        )}
        <UserStorageMeter userId={userId} />
      </TabsContent>
    </Tabs>
  );
}
export default function UploadsSettings() {
  const user = useUser();
  return user ? <UploadsNavigation key={user.id} userId={user.id} /> : null;
}
