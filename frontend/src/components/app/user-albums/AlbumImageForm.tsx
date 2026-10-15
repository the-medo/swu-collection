import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { useAlbumMutation } from '@/api/user-albums/useAlbumMutation.ts';
import type { UserAlbum, UserAlbumImage } from '../../../../../types/UserAlbum.ts';

export function AlbumImageForm({
  album,
  image,
  onClose,
  onReload,
}: {
  album: UserAlbum;
  image: UserAlbumImage;
  onClose(): void;
  onReload?: () => Promise<{ album: UserAlbum; image: UserAlbumImage }>;
}) {
  const mutation = useAlbumMutation();
  const [reloading, setReloading] = useState(false);
  const [reloadError, setReloadError] = useState<string>();
  const [revision, setRevision] = useState(album.revision);
  const [initial] = useState(() => ({ caption: image.caption, altText: image.altText }));
  const [baseline, setBaseline] = useState(initial);
  const form = useForm({
    defaultValues: initial,
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({
          action: 'image',
          id: album.id,
          fileId: image.fileId,
          input: {
            revision,
            ...(value.caption.trim() !== baseline.caption ? { caption: value.caption.trim() } : {}),
            ...(value.altText.trim() !== baseline.altText ? { altText: value.altText.trim() } : {}),
          },
        });
        onClose();
      } catch {
        /* Keep the form open so the user can recover. */
      }
    },
  });
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !mutation.isPending && !reloading) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit image details</DialogTitle>
          <DialogDescription>These details apply only to this album.</DialogDescription>
        </DialogHeader>
        <img
          src={image.thumbnailUrl}
          alt={image.altText}
          className="mx-auto max-h-40 object-contain"
        />
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="caption">
            {field => (
              <div className="space-y-1">
                <label htmlFor="album-caption">Caption</label>
                <Textarea
                  id="album-caption"
                  maxLength={500}
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="altText">
            {field => (
              <div className="space-y-1">
                <label htmlFor="album-alt">Image description (alt text)</label>
                <Input
                  id="album-alt"
                  maxLength={300}
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Describe the image for people using a screen reader.
                </p>
              </div>
            )}
          </form.Field>
          {mutation.isError && (
            <p role="alert" className="text-destructive">
              {mutation.error.message}
            </p>
          )}
          {album &&
            mutation.error &&
            'status' in mutation.error &&
            mutation.error.status === 409 && (
              <div className="space-y-2 text-sm">
                <p>
                  Keep your edits and refresh unchanged fields from the latest version, or cancel to
                  discard your edits.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending || reloading || !onReload}
                  onClick={async () => {
                    if (!onReload) return;
                    setReloading(true);
                    setReloadError(undefined);
                    try {
                      const latest = await onReload();
                      if (form.getFieldValue('caption').trim() === baseline.caption)
                        form.setFieldValue('caption', latest.image.caption);
                      if (form.getFieldValue('altText').trim() === baseline.altText)
                        form.setFieldValue('altText', latest.image.altText);
                      setBaseline({
                        caption: latest.image.caption,
                        altText: latest.image.altText,
                      });
                      setRevision(latest.album.revision);
                      mutation.reset();
                    } catch (error) {
                      setReloadError(
                        error instanceof Error ? error.message : 'Could not reload the album.',
                      );
                    } finally {
                      setReloading(false);
                    }
                  }}
                >
                  {reloading ? 'Loading latest version…' : 'Keep edits using latest version'}
                </Button>
              </div>
            )}
          {reloadError && (
            <p role="alert" className="text-sm text-destructive">
              {reloadError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending || reloading}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button disabled={mutation.isPending || reloading} type="submit">
              {mutation.isPending ? 'Saving…' : 'Save image details'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
