import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useUserFiles } from '@/api/user-files/useUserFiles.ts';
import type { useUploadUserFile } from '@/api/user-files/useUploadUserFile.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import {
  maxUserFileBytes,
  userFileMimeTypes,
  type UserFile,
} from '../../../../../types/UserFile.ts';
import { recommendedHeaderImageWidth } from '../../../../../types/ImageGallery.ts';
import { minimumHeaderCropWidth } from '../../../../../types/UserHeader.ts';
import { minimumAvatarCropSize } from '../../../../../types/UserAvatar.ts';
import { formatBytes } from '../pages/settings/uploads/formatBytes.ts';

export function UploadedImagePicker({
  userId,
  purpose = 'avatar',
  upload,
  selectedId,
  disabled,
  onSelect,
}: {
  userId: string;
  purpose?: 'avatar' | 'header';
  upload: ReturnType<typeof useUploadUserFile>;
  selectedId?: string;
  disabled: boolean;
  onSelect(file: UserFile): void;
}) {
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string>();
  const picker = useRef<HTMLInputElement>(null);
  const activeUpload = useRef<AbortController | null>(null);
  useEffect(() => () => activeUpload.current?.abort(), []);
  const query = useUserFiles(userId, page);
  const data = query.data;
  const busy = disabled || upload.isPending;
  const full = !!data && data.usedBytes >= data.quotaBytes;
  const tooSmallForPurpose = (file: Pick<UserFile, 'width' | 'height'>) =>
    purpose === 'header'
      ? file.width < minimumHeaderCropWidth
      : Math.min(file.width, file.height) < minimumAvatarCropSize;
  const uploadImage = async (file: File) => {
    if (busy || activeUpload.current) return;
    setError(undefined);
    if (file.size > maxUserFileBytes) {
      setError('Images must be 10 MB or smaller.');
      if (picker.current) picker.current.value = '';
      return;
    }
    const controller = new AbortController();
    activeUpload.current = controller;
    try {
      const result = await upload.mutateAsync({
        userId,
        file,
        signal: controller.signal,
        purpose: purpose === 'header' ? 'header' : undefined,
      });
      if (controller.signal.aborted) return;
      setPage(0);
      if (tooSmallForPurpose(result)) {
        setError(
          `Image uploaded, but ${purpose === 'header' ? 'this image is too narrow for a 4:1 header crop' : 'avatars need an image of at least 100 × 100 pixels'}. Choose a larger image.`,
        );
      } else {
        onSelect(result);
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : 'Could not upload this image.');
    } finally {
      activeUpload.current = null;
      if (picker.current) picker.current.value = '';
    }
  };
  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Choose from your uploads or add a new image.
        </p>
        <input
          ref={picker}
          type="file"
          accept={userFileMimeTypes.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-label={`Choose ${purpose} image`}
          disabled={busy || !data?.uploadsEnabled || full}
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file);
          }}
        />
        <Button
          variant="outline"
          disabled={busy || !data?.uploadsEnabled || full}
          onClick={() => picker.current?.click()}
        >
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {upload.isPending ? 'Uploading image…' : 'Upload image'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WebP or still GIF, up to 10 MB.{' '}
        {purpose === 'header'
          ? '1500 pixels wide is recommended; smaller images can still be used.'
          : 'At least 100 × 100 pixels.'}{' '}
        New images are saved to your Uploads library and count toward its storage limit.
      </p>
      {query.isPending && (
        <p role="status" className="text-sm">
          Loading your images…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {formatBytes(data.usedBytes)} of {formatBytes(data.quotaBytes)} used
            </span>
            <Link to="/settings" search={{ page: 'uploads' }} className="text-primary underline">
              Manage uploads
            </Link>
          </div>
          {full && (
            <p role="status" className="text-sm">
              Storage is full. Choose an existing image or delete an upload to make room.
            </p>
          )}
          {!data.uploadsEnabled && (
            <p role="status" className="text-sm">
              New uploads are currently unavailable.
            </p>
          )}
          {!data.files.length ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {page
                ? 'No more images. Return to the previous page.'
                : `No images yet. Upload an image to create your ${purpose}.`}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 @sm:grid-cols-3 @lg:grid-cols-4">
              {data.files.map(file => {
                const tooSmall = tooSmallForPurpose(file);
                const lowResolution =
                  purpose === 'header' && !tooSmall && file.width < recommendedHeaderImageWidth;
                return (
                  <button
                    type="button"
                    key={file.id}
                    disabled={busy || tooSmall}
                    aria-label={`Select ${file.fileName}${tooSmall ? ' (too small)' : lowResolution ? ' (low resolution)' : ''}`}
                    aria-pressed={file.id === selectedId}
                    className={cn(
                      'min-w-0 overflow-hidden rounded-lg border bg-card text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                      file.id === selectedId && 'border-primary ring-2 ring-primary',
                    )}
                    onClick={() => {
                      setError(undefined);
                      onSelect(file);
                    }}
                  >
                    <img
                      src={file.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full bg-muted object-contain p-2"
                    />
                    <div className="space-y-1 p-2">
                      <p className="truncate text-sm">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {tooSmall
                          ? purpose === 'header'
                            ? 'Too narrow for a 4:1 crop'
                            : 'Too small for a square avatar'
                          : `${file.width} × ${file.height}`}
                      </p>
                      {lowResolution && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">Low resolution</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {(page > 0 || data.hasMore) && (
            <nav
              aria-label={`${purpose} image pages`}
              className="flex items-center justify-between gap-2"
            >
              <Button variant="outline" disabled={!page || busy} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm">Page {page + 1}</span>
              <Button
                variant="outline"
                disabled={!data.hasMore || busy}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
