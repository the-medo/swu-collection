import type { RefObject } from 'react';
import { ArrowLeft, ArrowRight, Images, LoaderCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { UserAlbumImage } from '../../../../../types/UserAlbum.ts';

export function AlbumPhotoViewer({
  title,
  image,
  index,
  total,
  busy,
  previousDisabled,
  error,
  onPrevious,
  onNext,
  onClose,
  onReload,
  reloading,
  opener,
  fallback,
}: {
  title: string;
  image: UserAlbumImage;
  index: number;
  total: number;
  busy: boolean;
  previousDisabled: boolean;
  error?: string;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onReload: () => void;
  reloading: boolean;
  opener: RefObject<HTMLButtonElement | null>;
  fallback: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-w-6xl gap-0 overflow-y-auto rounded-2xl p-0"
        onCloseAutoFocus={event => {
          event.preventDefault();
          (opener.current?.isConnected ? opener.current : fallback.current)?.focus({
            preventScroll: true,
          });
        }}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' && !previousDisabled && !busy) {
            event.preventDefault();
            onPrevious();
          } else if (event.key === 'ArrowRight' && !busy && total > 1) {
            event.preventDefault();
            onNext();
          }
        }}
      >
        <div className="flex min-h-14 items-center gap-2 px-4 pr-14 sm:px-5 sm:pr-14">
          <Images className="size-4 shrink-0 text-muted-foreground" />
          <DialogTitle className="m-0! min-w-0 truncate border-0! p-0! text-sm! font-medium!">
            {title}
          </DialogTitle>
        </div>
        <div className="relative flex min-h-40 items-center justify-center bg-[#090d0b] sm:h-[min(65dvh,760px)]">
          <img
            key={image.fileId}
            src={image.url}
            alt={image.altText || image.caption || `Album image ${index + 1}`}
            className="max-h-[65dvh] w-full object-contain sm:h-full"
          />
          <nav
            aria-label="Album image navigation"
            className="pointer-events-none absolute inset-0 flex items-center justify-between p-2 sm:p-4"
          >
            <button
              type="button"
              aria-label="Previous image"
              aria-disabled={previousDisabled || busy}
              tabIndex={previousDisabled || busy ? -1 : 0}
              onClick={() => {
                if (!previousDisabled && !busy) onPrevious();
              }}
              className="pointer-events-auto flex size-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white aria-disabled:opacity-25 sm:size-12"
            >
              <ArrowLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              aria-disabled={busy || total < 2}
              aria-busy={busy}
              tabIndex={busy || total < 2 ? -1 : 0}
              onClick={() => {
                if (!busy && total > 1) onNext();
              }}
              className="pointer-events-auto flex size-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white aria-disabled:opacity-25 sm:size-12"
            >
              {busy ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <ArrowRight className="size-5" />
              )}
            </button>
          </nav>
        </div>
        <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
          <DialogDescription className="m-0! min-w-0 whitespace-pre-wrap break-words text-xs! leading-relaxed!">
            {image.caption || image.altText || 'A moment from the event.'}
          </DialogDescription>
          <p
            aria-live="polite"
            aria-atomic="true"
            className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground"
          >
            Image {index + 1} of {total}
          </p>
        </div>
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs"
          >
            <p className="text-destructive">{error}</p>
            <Button
              size="sm"
              variant="outline"
              aria-disabled={reloading}
              aria-busy={reloading}
              tabIndex={reloading ? -1 : 0}
              className="aria-disabled:opacity-50"
              onClick={() => {
                if (!reloading) onReload();
              }}
            >
              Reload album
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
