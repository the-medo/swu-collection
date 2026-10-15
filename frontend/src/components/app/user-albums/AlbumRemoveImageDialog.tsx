import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAlbumMembership } from '@/api/user-albums/useAlbumMembership.ts';
import { useAlbumMutation } from '@/api/user-albums/useAlbumMutation.ts';
import { useDeleteUserFile } from '@/api/user-files/useDeleteUserFile.ts';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
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
import type { UserAlbum, UserAlbumImage } from '../../../../../types/UserAlbum.ts';

export function AlbumRemoveImageDialog({
  album,
  image,
  onClose,
  onRestoreFocus,
}: {
  album: UserAlbum;
  image: UserAlbumImage;
  onClose(): void;
  onRestoreFocus(): void;
}) {
  const [deleteFile, setDeleteFile] = useState(false);
  const membership = useAlbumMembership(album.userId, [image.fileId]);
  const remove = useAlbumMutation();
  const destroy = useDeleteUserFile();
  const busy = remove.isPending || destroy.isPending;
  const error = deleteFile ? destroy.error : remove.error;
  return (
    <AlertDialog
      open
      onOpenChange={open => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogContent
        className="max-h-[90dvh] overflow-y-auto rounded-[20px]"
        onCloseAutoFocus={event => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this image?</AlertDialogTitle>
          <AlertDialogDescription>
            Remove it from “{album.title}”. By default, the uploaded file stays in All images and
            any other albums.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <img
          src={image.thumbnailUrl}
          alt={image.altText || 'Image to remove'}
          className="mx-auto max-h-36 rounded-xl object-contain"
        />
        <div className="space-y-3 rounded-xl border p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
            <Checkbox
              checked={deleteFile}
              disabled={busy}
              onCheckedChange={value => {
                setDeleteFile(value === true);
                remove.reset();
                destroy.reset();
              }}
            />
            Also delete the uploaded file
          </label>
          {deleteFile ? (
            <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
              <p>
                This permanently deletes the file from All images and every album that uses it.
                Existing image links will stop working. This cannot be undone.
              </p>
              {membership.isSuccess && (
                <p>
                  {membership.data.length}{' '}
                  {membership.data.length === 1 ? 'album uses' : 'albums use'} this file.
                </p>
              )}
              {membership.isFetching && <p role="status">Checking affected albums…</p>}
              {membership.isError && (
                <div role="alert">
                  Could not check affected albums.{' '}
                  <Button variant="outline" onClick={() => void membership.refetch()}>
                    Try again
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Keep the file to reuse it later. Removing it from an album doesn’t free storage.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep image</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || (deleteFile && (!membership.isSuccess || membership.isFetching))}
            className={
              deleteFile
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
            onClick={event => {
              event.preventDefault();
              if (deleteFile)
                destroy.mutate({ userId: album.userId, id: image.fileId }, { onSuccess: onClose });
              else
                remove.mutate(
                  {
                    action: 'remove',
                    id: album.id,
                    fileId: image.fileId,
                    revision: album.revision,
                  },
                  { onSuccess: onClose },
                );
            }}
          >
            {deleteFile && <Trash2 className="size-4" />}
            {busy ? 'Removing…' : deleteFile ? 'Delete file everywhere' : 'Remove from album'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
