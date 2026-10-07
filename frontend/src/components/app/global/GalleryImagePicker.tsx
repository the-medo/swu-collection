import { useState } from 'react';
import { useImageGallery } from '@/api/image-gallery/useImageGallery.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { minimumHeaderCropWidth, type HeaderImageOption } from '../../../../../types/UserHeader.ts';
import { recommendedHeaderImageWidth } from '../../../../../types/ImageGallery.ts';

export function GalleryImagePicker({
  selectedId,
  disabled,
  onSelect,
}: {
  selectedId?: string;
  disabled: boolean;
  onSelect(image: HeaderImageOption): void;
}) {
  const [page, setPage] = useState(0);
  const query = useImageGallery(page);
  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm text-muted-foreground">
        Choose artwork from our gallery. 1500 pixels wide is recommended; smaller images can still
        be used.
      </p>
      {query.isPending && (
        <p role="status" className="text-sm">
          Loading gallery…
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
      {query.data && (
        <>
          {!query.data.images.length && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {page
                ? 'No more images. Return to the previous page.'
                : 'No gallery images yet. Check back when artwork has been added.'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3">
            {query.data.images.map(image => {
              const tooSmall = image.width < minimumHeaderCropWidth;
              const lowResolution = !tooSmall && image.width < recommendedHeaderImageWidth;
              return (
                <button
                  key={image.id}
                  type="button"
                  disabled={disabled || tooSmall}
                  aria-label={`Select ${image.title}${tooSmall ? ' (too small)' : lowResolution ? ' (low resolution)' : ''}`}
                  aria-pressed={selectedId === image.id}
                  className={cn(
                    'min-w-0 overflow-hidden rounded-lg border bg-card text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                    selectedId === image.id && 'border-primary ring-2 ring-primary',
                  )}
                  onClick={() =>
                    onSelect({
                      source: { source: 'gallery', galleryImageId: image.id },
                      name: image.title,
                      url: image.url,
                      width: image.width,
                      height: image.height,
                    })
                  }
                >
                  <img
                    src={image.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full bg-muted object-contain"
                  />
                  <div className="space-y-1 p-2">
                    <p className="truncate text-sm">{image.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {tooSmall ? 'Too narrow for a 4:1 crop' : `${image.width} × ${image.height}`}
                    </p>
                    {lowResolution && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">Low resolution</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {(page > 0 || query.data.hasMore) && (
            <nav
              aria-label="Gallery image pages"
              className="flex items-center justify-between gap-2"
            >
              <Button
                variant="outline"
                disabled={!page || disabled}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm">Page {page + 1}</span>
              <Button
                variant="outline"
                disabled={!query.data.hasMore || disabled}
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
