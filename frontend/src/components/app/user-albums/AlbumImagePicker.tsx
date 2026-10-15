import { useState } from 'react';
import { useUserFiles } from '@/api/user-files/useUserFiles.ts';
import { useAlbumMembership } from '@/api/user-albums/useAlbumMembership.ts';
import { useAlbumMutation } from '@/api/user-albums/useAlbumMutation.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import type { UserAlbum } from '../../../../../types/UserAlbum.ts';

export function AlbumImagePicker({ album, onClose }: { album: UserAlbum; onClose(): void }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const query = useUserFiles(album.userId, page);
  const membership = useAlbumMembership(
    album.userId,
    query.data?.files.map(file => file.id) ?? [],
    album.id,
  );
  const mutation = useAlbumMutation();
  const included = new Set(membership.data?.map(item => item.fileId));
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add existing images</DialogTitle>
          <DialogDescription>
            Choose up to 100 images from your uploads. Images already in this album are marked.
          </DialogDescription>
        </DialogHeader>
        {query.isPending && <p role="status">Loading your images…</p>}
        {query.isError && (
          <div role="alert">
            {query.error.message} <Button onClick={() => void query.refetch()}>Try again</Button>
          </div>
        )}
        {membership.isError && (
          <div role="alert">
            {membership.error.message}{' '}
            <Button onClick={() => void membership.refetch()}>Retry album membership</Button>
          </div>
        )}
        {query.data && !query.data.files.length && (
          <p>No images yet. Upload some images to your library first.</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {query.data?.files.map(file => (
            <button
              key={file.id}
              type="button"
              aria-pressed={selected.includes(file.id)}
              aria-label={`Select ${file.fileName}${included.has(file.id) ? ' (already included)' : ''}`}
              disabled={
                mutation.isPending ||
                !membership.isSuccess ||
                included.has(file.id) ||
                (selected.length >= 100 && !selected.includes(file.id))
              }
              className="min-w-0 rounded-lg border p-2 text-left aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary disabled:opacity-50"
              onClick={() =>
                setSelected(previous =>
                  previous.includes(file.id)
                    ? previous.filter(id => id !== file.id)
                    : [...previous, file.id],
                )
              }
            >
              <img
                src={file.thumbnailUrl}
                alt=""
                loading="lazy"
                className="aspect-square w-full bg-muted object-contain"
              />
              <span className="block truncate text-sm">{file.fileName}</span>
              {included.has(file.id) && <span className="text-xs">Already included</span>}
            </button>
          ))}
        </div>
        <nav className="flex justify-between gap-2" aria-label="Upload pages">
          <Button
            variant="outline"
            disabled={!page || mutation.isPending}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span>Page {page + 1}</span>
          <Button
            variant="outline"
            disabled={!query.data?.hasMore || mutation.isPending}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </nav>
        {mutation.isError && (
          <p role="alert" className="text-destructive">
            {mutation.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selected.length || mutation.isPending}
            onClick={() =>
              mutation.mutate(
                {
                  action: 'add',
                  id: album.id,
                  input: { revision: album.revision, fileIds: selected },
                },
                { onSuccess: onClose },
              )
            }
          >
            {mutation.isPending ? 'Adding…' : `Add ${selected.length} images`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
