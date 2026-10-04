import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Images, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useInfiniteUserFiles } from '@/api/user-files/useInfiniteUserFiles.ts';
import { useUploadUserFile } from '@/api/user-files/useUploadUserFile.ts';
import { useInfiniteQueryScroll } from '@/hooks/useInfiniteQueryScroll.ts';
import {
  maxUserFileBytes,
  userFileMimeTypes,
  type UserFile,
} from '../../../../../../../types/UserFile.ts';
import { formatBytes } from './formatBytes.ts';
import { UserFileDetail } from './UserFileDetail.tsx';
import { UploadDropzone } from './UploadDropzone.tsx';

function UploadsLibrary({ userId }: { userId: string }) {
  const [selected, setSelected] = useState<UserFile | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const galleryButton = useRef<HTMLButtonElement | null>(null);
  const galleryGrid = useRef<HTMLDivElement>(null);
  const galleryHeading = useRef<HTMLHeadingElement>(null);
  const loadMoreButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const focusAfterLoad = useRef<{ index: number; source: Element; automatic: boolean } | null>(
    null,
  );
  const activeUpload = useRef<AbortController | null>(null);
  useEffect(() => () => activeUpload.current?.abort(), []);
  const { toast } = useToast();
  const query = useInfiniteUserFiles(userId);
  const upload = useUploadUserFile();
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
      const nextImage = galleryGrid.current?.children[Math.min(index, files.length - 1)];
      if (nextImage instanceof HTMLElement) nextImage.focus();
      else galleryHeading.current?.focus();
    }
  }, [files, query.isFetching, query.isError]);
  const full = !!data && data.usedBytes >= data.quotaBytes;
  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    if (activeUpload.current) {
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
    const controller = new AbortController();
    activeUpload.current = controller;
    let uploaded = 0;
    try {
      for (const file of files) {
        if (
          !userFileMimeTypes.some(type => type === file.type) &&
          !(file.type === '' && /\.(jpe?g|png|webp|gif)$/i.test(file.name))
        )
          throw new Error(`${file.name}: choose a JPEG, PNG, WebP or still GIF image.`);
        if (file.size > maxUserFileBytes)
          throw new Error(`${file.name}: images must be 10 MB or smaller.`);
      }
      for (const [index, file] of files.entries()) {
        if (controller.signal.aborted) return;
        setProgress({ current: index + 1, total: files.length });
        await upload.mutateAsync({ userId, file, signal: controller.signal });
        uploaded++;
      }
      if (!controller.signal.aborted)
        toast({ title: `${uploaded} ${uploaded === 1 ? 'image' : 'images'} uploaded` });
    } catch (error) {
      if (controller.signal.aborted) return;
      toast({
        title: 'Upload stopped',
        description: `${uploaded ? `${uploaded} uploaded. ` : ''}${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: 'destructive',
      });
    } finally {
      activeUpload.current = null;
      if (!controller.signal.aborted) {
        setProgress(null);
      }
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
              : 'Uploads are unavailable until your library loads. Use Try again in Gallery below.'}
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
                Optimized images and gallery previews count toward your storage.
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
      <Card role="region" aria-labelledby="gallery-heading" className="space-y-4 p-4">
        <div className="space-y-1">
          <h3 ref={galleryHeading} id="gallery-heading" tabIndex={-1}>
            Gallery
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
            <div ref={galleryGrid} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {files.map(file => (
                <button
                  type="button"
                  key={file.id}
                  className="min-w-0 overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={event => {
                    galleryButton.current = event.currentTarget;
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
            if (galleryButton.current?.isConnected) galleryButton.current.focus();
            else uploadButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}
export default function UploadsSettings() {
  const user = useUser();
  return user ? <UploadsLibrary key={user.id} userId={user.id} /> : null;
}
