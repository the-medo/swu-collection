import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useImageGallery } from '@/api/image-gallery/useImageGallery.ts';
import { useUploadGalleryImage } from '@/api/image-gallery/useUploadGalleryImage.ts';
import { useDeleteGalleryImage } from '@/api/image-gallery/useDeleteGalleryImage.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { maxUserFileBytes, userFileMimeTypes } from '../../../../../types/UserFile.ts';
import type { GalleryImage } from '../../../../../types/ImageGallery.ts';

export function ImageGalleryPage() {
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<GalleryImage>();
  const [error, setError] = useState<string>();
  const picker = useRef<HTMLInputElement>(null);
  const query = useImageGallery(page);
  const upload = useUploadGalleryImage();
  const remove = useDeleteGalleryImage();
  const { toast } = useToast();
  const busy = upload.isPending || remove.isPending;
  const form = useForm({
    defaultValues: { title: '', file: null as File | null },
    onSubmit: async ({ value, formApi }) => {
      if (!value.file || busy) return;
      setError(undefined);
      if (value.file.size > maxUserFileBytes) {
        setError('Images must be 10 MB or smaller.');
        return;
      }
      try {
        await upload.mutateAsync({ title: value.title.trim(), file: value.file });
        setPage(0);
        formApi.reset();
        if (picker.current) picker.current.value = '';
        toast({ title: 'Image added to the gallery' });
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Could not upload this image.');
      }
    },
  });
  return (
    <section className="@container space-y-5" aria-labelledby="gallery-heading">
      <div className="space-y-2">
        <h3 id="gallery-heading">Image gallery</h3>
        <p className="text-sm text-muted-foreground">
          Upload artwork of any dimensions to the shared gallery. JPEG, PNG, WebP or still GIF, up
          to 10 MB.
        </p>
      </div>
      <form
        className="space-y-3 rounded-lg border p-4"
        onSubmit={event => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="title">
          {field => (
            <div className="space-y-2">
              <Label htmlFor="gallery-title">Image title</Label>
              <Input
                id="gallery-title"
                required
                maxLength={120}
                value={field.state.value}
                disabled={busy}
                onBlur={field.handleBlur}
                onChange={event => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="file">
          {field => (
            <div className="space-y-2">
              <Label htmlFor="gallery-file">Artwork</Label>
              <Input
                ref={picker}
                id="gallery-file"
                type="file"
                required
                accept={userFileMimeTypes.join(',')}
                disabled={busy || !query.data?.uploadsEnabled}
                onChange={event => {
                  const file = event.target.files?.[0] ?? null;
                  field.handleChange(file);
                  setError(undefined);
                  if (file) {
                    const title = file.name.replace(/\.[^.]+$/, '').trim() || file.name;
                    form.setFieldValue('title', title.slice(0, 120));
                  }
                }}
              />
            </div>
          )}
        </form.Field>
        <Button type="submit" disabled={busy || !query.data?.uploadsEnabled}>
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {upload.isPending ? 'Uploading image…' : 'Add to gallery'}
        </Button>
        {query.data && !query.data.uploadsEnabled && (
          <p role="status" className="text-sm">
            Image uploads are currently unavailable.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
      {query.isPending && <p role="status">Loading gallery…</p>}
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
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              {page
                ? 'No more images. Return to the previous page.'
                : 'The gallery is empty. Add the first image above.'}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @xl:grid-cols-3">
            {query.data.images.map(image => (
              <article key={image.id} className="min-w-0 overflow-hidden rounded-lg border">
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View ${image.title}`}
                >
                  <img
                    src={image.thumbnailUrl}
                    alt={image.title}
                    loading="lazy"
                    className="aspect-video w-full bg-muted object-contain"
                  />
                </a>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{image.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {image.width} × {image.height}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Delete ${image.title}`}
                    onClick={() => setDeleting(image)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {(page > 0 || query.data.hasMore) && (
            <nav aria-label="Gallery pages" className="flex items-center justify-between gap-2">
              <Button variant="outline" disabled={!page || busy} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm">Page {page + 1}</span>
              <Button
                variant="outline"
                disabled={!query.data.hasMore || busy}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
      <AlertDialog
        open={!!deleting}
        onOpenChange={open => {
          if (!open) setDeleting(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete gallery image?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its thumbnail will be removed from the gallery. Headers
              already saved from this image will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={event => {
                event.preventDefault();
                if (!deleting) return;
                void remove
                  .mutateAsync(deleting.id)
                  .then(() => {
                    setDeleting(undefined);
                    toast({ title: 'Gallery image deleted' });
                  })
                  .catch((error: Error) =>
                    toast({
                      title: 'Could not delete image',
                      description: error.message,
                      variant: 'destructive',
                    }),
                  );
              }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete image'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
