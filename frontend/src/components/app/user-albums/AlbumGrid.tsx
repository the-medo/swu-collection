import { useAlbumLoadMore } from './useAlbumLoadMore.ts';
import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Images, GripVertical, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import type { UserAlbumImage } from '../../../../../types/UserAlbum.ts';

export function AlbumGrid({
  title,
  images,
  hasMore,
  loading,
  onLoadMore,
  renderActions,
  onMove,
  disabled,
  coverFileId,
  preview = false,
}: {
  title: string;
  images: UserAlbumImage[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore(): Promise<unknown>;
  renderActions?: (image: UserAlbumImage, index: number) => ReactNode;
  onMove?: (fileId: string, beforeFileId: string) => void;
  disabled?: boolean;
  coverFileId?: string;
  preview?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dragged = useRef<string | null>(null);
  const { containerRef, loadMore } = useAlbumLoadMore(images.length, loading, onLoadMore);
  const index = images.findIndex(image => image.fileId === selected);
  const image = images[index];
  const ImageHeading = preview ? 'h4' : renderActions ? 'h3' : 'h2';
  const next = async () => {
    if (index < images.length - 1) setSelected(images[index + 1].fileId);
    else if (hasMore && !loading) await onLoadMore();
  };
  return (
    <section className="space-y-5" aria-label={preview ? `${title} photos` : 'Album images'}>
      <div className={preview ? 'sr-only' : 'flex flex-wrap items-center justify-between gap-2'}>
        <ImageHeading
          ref={heading}
          tabIndex={-1}
          className="m-0! border-0! p-0! text-lg! font-semibold! tracking-tight!"
        >
          Images
        </ImageHeading>
        {onMove && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GripVertical className="size-3.5" /> Drag to arrange, or use the arrow controls
          </p>
        )}
      </div>
      {!images.length && (
        <div className="rounded-[20px] border border-dashed bg-[var(--album-tint)]/30 px-5 py-12 text-center text-muted-foreground">
          <Images className="mx-auto mb-4 size-9 text-[var(--album-accent)]" strokeWidth={1.2} />
          <p className="text-sm font-medium text-foreground">This album has no images yet.</p>
          {onMove && (
            <p className="mt-2 text-xs">Upload your first images above to start your album.</p>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      >
        {images.map((item, itemIndex) => (
          <article
            key={item.fileId}
            className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-[var(--album-accent)]/40"
            draggable={!!onMove && !disabled}
            onDragStart={event => {
              if (!onMove || disabled) return;
              dragged.current = item.fileId;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', item.fileId);
            }}
            onDragEnd={() => {
              dragged.current = null;
            }}
            onDragOver={event => {
              if (dragged.current && onMove && !disabled) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={event => {
              if (!dragged.current || !onMove || disabled) return;
              event.preventDefault();
              if (dragged.current !== item.fileId) onMove(dragged.current, item.fileId);
              dragged.current = null;
            }}
          >
            <button
              data-album-item
              type="button"
              className="relative block w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              aria-label={`View image ${itemIndex + 1}${item.caption ? `: ${item.caption}` : ''}`}
              onClick={event => {
                opener.current = event.currentTarget;
                setSelected(item.fileId);
              }}
            >
              <img
                src={item.thumbnailUrl}
                alt={item.altText}
                draggable={false}
                loading="lazy"
                className="aspect-[4/3] w-full bg-muted/50 object-contain transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transform-none"
              />
              <span
                aria-hidden="true"
                className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium tabular-nums text-white"
              >
                {String(itemIndex + 1).padStart(2, '0')}
              </span>
              {coverFileId === item.fileId && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-[#dce7a0] px-2 py-1 text-[10px] font-semibold text-[#17352e]">
                  <Star className="size-3 fill-current" />
                  Cover
                </span>
              )}
            </button>
            {item.caption && (
              <p className="whitespace-pre-wrap break-words px-4 pb-3 pt-4 text-sm leading-relaxed">
                {item.caption}
              </p>
            )}
            {renderActions && (
              <div className="mt-auto border-t border-border/70 bg-muted/15 px-2 py-1.5">
                {renderActions(item, itemIndex)}
              </div>
            )}
          </article>
        ))}
      </div>
      {hasMore && (
        <Button variant="outline" disabled={loading || disabled} onClick={() => void loadMore()}>
          {loading ? 'Loading…' : 'Load more images'}
        </Button>
      )}
      {image && (
        <Dialog
          open
          onOpenChange={open => {
            if (!open) setSelected(null);
          }}
        >
          <DialogContent
            className="max-h-[95dvh] max-w-5xl overflow-y-auto"
            onCloseAutoFocus={event => {
              event.preventDefault();
              if (opener.current?.isConnected) opener.current.focus();
              else heading.current?.focus();
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowLeft' && index > 0) {
                event.preventDefault();
                setSelected(images[index - 1].fileId);
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                void next();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {title} · image {index + 1}
              </DialogTitle>
              <DialogDescription>
                {image.width} × {image.height}
              </DialogDescription>
            </DialogHeader>
            <img
              src={image.url}
              alt={image.altText || image.caption || `Album image ${index + 1}`}
              className="max-h-[65dvh] w-full object-contain"
            />
            {image.caption && <p className="whitespace-pre-wrap break-words">{image.caption}</p>}
            <nav className="flex justify-between gap-2" aria-label="Album image navigation">
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={() => setSelected(images[index - 1].fileId)}
              >
                Previous image
              </Button>
              <Button
                variant="outline"
                disabled={index === images.length - 1 && (!hasMore || loading)}
                onClick={() => void next()}
              >
                {index === images.length - 1 && hasMore
                  ? loading
                    ? 'Loading…'
                    : 'Load more images'
                  : 'Next image'}
              </Button>
            </nav>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
