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
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { useAlbumMutation } from '@/api/user-albums/useAlbumMutation.ts';
import {
  createUserAlbumInput,
  type AlbumVisibility,
  type UserAlbum,
  type AlbumTournament,
} from '../../../../../types/UserAlbum.ts';

export function AlbumForm({
  album,
  onClose,
  onReload,
  onSaved,
  tournament,
  onRestoreFocus,
}: {
  album?: UserAlbum;
  onClose(): void;
  onReload?: () => Promise<UserAlbum>;
  onSaved(id: string): void;
  tournament?: Pick<AlbumTournament, 'id' | 'name'>;
  onRestoreFocus?: () => void;
}) {
  const mutation = useAlbumMutation();
  const [reloading, setReloading] = useState(false);
  const [reloadError, setReloadError] = useState<string>();
  const [revision, setRevision] = useState(album?.revision);
  const [initial] = useState(() => ({
    title: album?.title ?? tournament?.name.slice(0, 120) ?? '',
    description: album?.description ?? '',
    visibility: album?.visibility ?? ((tournament ? 'public' : 'unlisted') as AlbumVisibility),
  }));
  const [baseline, setBaseline] = useState(initial);
  const form = useForm({
    defaultValues: initial,
    onSubmit: async ({ value }) => {
      const input = createUserAlbumInput.parse(value);
      try {
        const result = await mutation.mutateAsync(
          album
            ? {
                action: 'update',
                id: album.id,
                input: {
                  revision: revision!,
                  ...(input.title !== baseline.title ? { title: input.title } : {}),
                  ...(input.description !== baseline.description
                    ? { description: input.description }
                    : {}),
                  ...(input.visibility !== baseline.visibility
                    ? { visibility: input.visibility }
                    : {}),
                },
              }
            : {
                action: 'create',
                input: { ...input, ...(tournament ? { tournamentId: tournament.id } : {}) },
              },
        );
        onSaved(result.id);
      } catch {
        /* Display the server error below; retain the entered fields. */
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
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        onCloseAutoFocus={event => {
          if (onRestoreFocus) {
            event.preventDefault();
            onRestoreFocus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{album ? 'Edit album' : 'Create album'}</DialogTitle>
          <DialogDescription>
            {tournament && !album
              ? `Create a photo album for ${tournament.name}, then upload your images.`
              : 'Give your images a home and choose who can see the album.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                !value.trim()
                  ? 'Enter an album title.'
                  : value.trim().length > 120
                    ? 'Use 120 characters or fewer.'
                    : undefined,
            }}
          >
            {field => (
              <div className="space-y-1">
                <label htmlFor="album-title">Title</label>
                <Input
                  id="album-title"
                  autoFocus
                  maxLength={120}
                  required
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
          <form.Field name="description">
            {field => (
              <div className="space-y-1">
                <label htmlFor="album-description">Description (optional)</label>
                <Textarea
                  id="album-description"
                  maxLength={2000}
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          {tournament && !album ? (
            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Public event album</p>
              <p className="mt-1 text-muted-foreground">
                This album and all photos you add will be visible to everyone on your profile and
                the tournament page.
              </p>
            </div>
          ) : (
            <form.Field name="visibility">
              {field => (
                <div className="space-y-2">
                  <label htmlFor="album-visibility">Visibility</label>
                  <select
                    id="album-visibility"
                    className="w-full rounded-md border bg-background p-2"
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value as AlbumVisibility)}
                  >
                    <option value="unlisted">Unlisted — anyone with the album link</option>
                    <option value="private">Private — only you</option>
                    <option value="public">Public — also shown on your profile</option>
                  </select>
                  <p className="text-sm text-muted-foreground">
                    Visibility controls the album page. Anyone with a direct image link can still
                    view that image.
                  </p>
                  {album?.tournament && field.state.value !== 'public' && (
                    <p className="text-sm font-medium">
                      Saving this privacy setting will also unlink the album from{' '}
                      {album.tournament.name}.
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          )}
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
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
                      if (form.getFieldValue('title').trim() === baseline.title)
                        form.setFieldValue('title', latest.title);
                      if (form.getFieldValue('description').trim() === baseline.description)
                        form.setFieldValue('description', latest.description);
                      if (form.getFieldValue('visibility') === baseline.visibility)
                        form.setFieldValue('visibility', latest.visibility);
                      setBaseline({
                        title: latest.title,
                        description: latest.description,
                        visibility: latest.visibility,
                      });
                      setRevision(latest.revision);
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
            <Button type="submit" disabled={mutation.isPending || reloading}>
              {mutation.isPending
                ? 'Saving…'
                : album
                  ? 'Save album'
                  : tournament
                    ? 'Create public album'
                    : 'Create album'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
