import { useEffect, useRef, useState, type RefObject } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { userFileMimeTypes } from '../../../../../../../types/UserFile.ts';

const hasFiles = (transfer: DataTransfer | null) => transfer?.types.includes('Files');

export function UploadDropzone({
  disabled,
  progress,
  onFiles,
  buttonRef,
  variant = 'library',
}: {
  disabled: boolean;
  progress: { current: number; total: number } | null;
  onFiles: (files: File[]) => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  variant?: 'library' | 'album';
}) {
  const picker = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest('input, textarea, [role="textbox"]'))) ||
        document.querySelector(
          '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
        )
      )
        return;
      const files = Array.from(event.clipboardData?.files ?? []).filter(file =>
        file.type.startsWith('image/'),
      );
      if (!files.length) return;
      event.preventDefault();
      onFiles(files);
    };
    // A missed drop must not navigate the browser away from the Uploads page.
    const preventFileNavigation = (event: DragEvent) => {
      if (hasFiles(event.dataTransfer)) event.preventDefault();
    };
    const resetDrag = () => {
      dragDepth.current = 0;
      setDragging(false);
    };
    document.addEventListener('paste', paste);
    document.addEventListener('dragover', preventFileNavigation);
    document.addEventListener('drop', preventFileNavigation);
    document.addEventListener('drop', resetDrag);
    document.addEventListener('dragend', resetDrag);
    window.addEventListener('blur', resetDrag);
    return () => {
      document.removeEventListener('paste', paste);
      document.removeEventListener('dragover', preventFileNavigation);
      document.removeEventListener('drop', preventFileNavigation);
      document.removeEventListener('drop', resetDrag);
      document.removeEventListener('dragend', resetDrag);
      window.removeEventListener('blur', resetDrag);
    };
  }, [onFiles]);

  const highlighted = dragging && !disabled;
  return (
    <section
      aria-label="Upload images"
      aria-disabled={disabled}
      aria-busy={!!progress}
      className={cn(
        'flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors sm:py-10',
        highlighted ? 'border-primary bg-primary/10' : 'border-border bg-muted/20',
        variant === 'album' &&
          'grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-none border-0 bg-transparent px-5 py-6 text-left sm:grid-cols-[auto_1fr_auto] sm:py-7',
        variant === 'album' && highlighted && 'bg-[var(--album-tint)]',
      )}
      onDragEnter={event => {
        if (!hasFiles(event.dataTransfer)) return;
        event.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={event => {
        if (!hasFiles(event.dataTransfer)) return;
        event.preventDefault();
        // Accept the event even while disabled so the upload guard can explain why.
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDrop={event => {
        if (!hasFiles(event.dataTransfer)) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div
        className={cn(
          'rounded-full p-3',
          highlighted ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          variant === 'album' &&
            'row-span-2 rounded-2xl bg-[var(--album-tint)] text-[var(--album-accent)]',
        )}
      >
        {progress ? <Loader2 className="size-7 animate-spin" /> : <ImagePlus className="size-7" />}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          {highlighted
            ? 'Drop to upload'
            : variant === 'album'
              ? 'Upload to this album'
              : 'Add images to your library'}
        </p>
        <p className={cn('text-sm text-muted-foreground', variant === 'album' && 'text-xs')}>
          {variant === 'album'
            ? 'Choose multiple images, drag them here, or paste from your clipboard.'
            : 'Drag images into this box, or paste an image anywhere on this page.'}
        </p>
      </div>
      <input
        ref={picker}
        type="file"
        multiple
        accept={userFileMimeTypes.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose images"
        disabled={disabled}
        onChange={event => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          onFiles(files);
        }}
      />
      <Button
        ref={buttonRef}
        disabled={disabled}
        className={
          variant === 'album'
            ? 'col-span-2 row-start-3 mt-2 rounded-xl bg-[#326149] text-white hover:bg-[#264c39] dark:bg-[#b9d4a8] dark:text-[#17352e] dark:hover:bg-[#c9dfbc] sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0'
            : undefined
        }
        onClick={() => picker.current?.click()}
      >
        <ImagePlus className="size-4" />
        {progress ? `Uploading ${progress.current} of ${progress.total}…` : 'Upload images'}
      </Button>
      {progress ? (
        <p
          role="status"
          className={cn(
            'text-sm text-muted-foreground',
            variant === 'album' && 'col-start-2 row-start-2 text-xs',
          )}
        >
          Optimizing and uploading image {progress.current} of {progress.total}…
        </p>
      ) : (
        <p
          className={cn(
            'text-xs text-muted-foreground',
            variant === 'album' && 'col-start-2 row-start-2',
          )}
        >
          JPEG, PNG, WebP or still GIF, up to 10 MB each.
        </p>
      )}
    </section>
  );
}
