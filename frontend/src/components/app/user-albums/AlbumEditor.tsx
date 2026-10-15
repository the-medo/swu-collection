import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink, Images, Settings2, Trash2 } from 'lucide-react';
import { useUserAlbum } from '@/api/user-albums/useUserAlbum.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { useAlbumMutation } from '@/api/user-albums/useAlbumMutation.ts';
import { Button } from '@/components/ui/button.tsx';
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
import { AlbumGrid } from './AlbumGrid.tsx';
import { AlbumForm } from './AlbumForm.tsx';
import { AlbumImagePicker } from './AlbumImagePicker.tsx';
import { AlbumImageForm } from './AlbumImageForm.tsx';
import { AlbumUploader } from './AlbumUploader.tsx';
import { AlbumShare } from './AlbumShare.tsx';
import { AlbumPrivacyControl } from './AlbumPrivacyControl.tsx';
import { AlbumTournamentControl } from './AlbumTournamentControl.tsx';
import { AlbumHeader } from './AlbumHeader.tsx';
import { AlbumImageActions } from './AlbumImageActions.tsx';
import { AlbumRemoveImageDialog } from './AlbumRemoveImageDialog.tsx';
import { albumTheme, albumPanel } from './albumStyles.ts';
import type { UserAlbumImage } from '../../../../../types/UserAlbum.ts';

export function AlbumEditor({
  id,
  userId,
  onBack,
  uploading,
  onUploadBusy,
}: {
  id: string;
  userId: string;
  onBack(): void;
  uploading: boolean;
  onUploadBusy(busy: boolean): void;
}) {
  const query = useUserAlbum(id);
  const mutation = useAlbumMutation();
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [tournamentBusy, setTournamentBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [picker, setPicker] = useState(false);
  const [editImage, setEditImage] = useState<UserAlbumImage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removeImage, setRemoveImage] = useState<UserAlbumImage | null>(null);
  const section = useRef<HTMLElement>(null);
  const removeOpener = useRef<HTMLElement | null>(null);
  const removeIndex = useRef(0);
  const data = query.data?.pages[0];
  const busy = uploading || mutation.isPending || privacyBusy || tournamentBusy || query.isFetching;
  const back = (
    <Button
      variant="ghost"
      className="h-8 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={onBack}
      disabled={busy}
    >
      <ArrowLeft className="size-4" />
      Back to albums
    </Button>
  );
  if (query.isPending)
    return (
      <div className="space-y-3">
        {back}
        <p role="status">Loading album…</p>
      </div>
    );
  if (!data || data.album.userId !== userId || albumAccessLost(query.error))
    return (
      <div className="space-y-3">
        {back}
        <p role="alert">{query.error?.message ?? 'Album not found.'}</p>
        <Button onClick={() => void query.refetch()}>Try again</Button>
      </div>
    );
  const album = data.album;
  const images = query.data!.pages.flatMap(page => page.images);
  const reloadAlbum = async () => {
    const result = await query.refetch();
    if (result.isError || !result.data)
      throw result.error ?? new Error('Could not reload the album.');
    return result.data;
  };
  return (
    <section ref={section} className={`${albumTheme} min-w-0 space-y-6`} aria-label="Album editor">
      {back}
      <AlbumHeader
        eyebrow="Your album"
        title={album.title}
        cover={album.cover?.thumbnailUrl}
        description={album.description}
        metadata={
          <span className="capitalize">
            {album.visibility} · {album.imageCount} images
          </span>
        }
        titleAction={
          <div className="flex items-center gap-1">
            {album.visibility !== 'private' && <AlbumShare id={id} />}
            {busy ? (
              <Button variant="ghost" size="icon" disabled aria-label="View album">
                <ExternalLink />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-[#fffaf0]/80 hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link
                  to="/albums/$albumId"
                  params={{ albumId: id }}
                  aria-label="View album"
                  title="View album"
                >
                  <ExternalLink />
                </Link>
              </Button>
            )}
          </div>
        }
        actions={
          <>
            <div className="mr-auto basis-full pb-3">
              <AlbumPrivacyControl album={album} disabled={busy} onBusy={setPrivacyBusy} hero />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg border border-white/20 text-[#fffaf0] hover:bg-white/10 hover:text-white"
              disabled={busy}
              onClick={() => setEdit(true)}
            >
              <Settings2 /> Edit album
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto rounded-lg text-[#fffaf0]/60 hover:bg-white/10 hover:text-white"
              disabled={busy}
              aria-label="Delete album"
              title="Delete album"
              onClick={() => {
                mutation.reset();
                setConfirmDelete(true);
              }}
            >
              <Trash2 />
            </Button>
          </>
        }
      />
      <AlbumTournamentControl album={album} disabled={busy} onBusy={setTournamentBusy} />
      <div className={`${albumPanel} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
          <div>
            <h3 className="m-0! p-0! text-base! font-semibold! tracking-tight!">Add images</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload from your device or reuse something in your library.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
            disabled={busy}
            onClick={() => setPicker(true)}
          >
            <Images /> Add existing images
          </Button>
        </div>
        <AlbumUploader
          album={album}
          editorBusy={mutation.isPending || privacyBusy || tournamentBusy || query.isFetching}
          onBusy={onUploadBusy}
        />
      </div>
      {mutation.isError && (
        <p role="alert" className="text-destructive">
          {mutation.error.message}
        </p>
      )}
      {query.isError && (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Reload album
          </Button>
        </div>
      )}
      <AlbumGrid
        title={album.title}
        coverFileId={album.cover?.fileId}
        images={images}
        hasMore={query.hasNextPage}
        loading={query.isFetching}
        disabled={busy}
        onLoadMore={() => query.fetchNextPage()}
        onMove={(fileId, beforeFileId) =>
          mutation.mutate({
            action: 'image',
            id,
            fileId,
            input: { revision: album.revision, move: { type: 'before', fileId: beforeFileId } },
          })
        }
        renderActions={(image, index) => (
          <AlbumImageActions
            index={index}
            total={album.imageCount}
            cover={album.cover?.fileId === image.fileId}
            disabled={busy}
            onEdit={() => setEditImage(image)}
            onMove={type =>
              mutation.mutate({
                action: 'image',
                id,
                fileId: image.fileId,
                input: { revision: album.revision, move: { type } },
              })
            }
            onCover={() =>
              mutation.mutate({
                action: 'update',
                id,
                input: { revision: album.revision, coverFileId: image.fileId },
              })
            }
            onRemove={() => {
              removeOpener.current =
                document.activeElement instanceof HTMLElement ? document.activeElement : null;
              removeIndex.current = index;
              setRemoveImage(image);
            }}
          />
        )}
      />
      {removeImage && (
        <AlbumRemoveImageDialog
          album={album}
          image={removeImage}
          onClose={() => setRemoveImage(null)}
          onRestoreFocus={() => {
            if (removeOpener.current?.isConnected) removeOpener.current.focus();
            else {
              const tiles =
                section.current?.querySelectorAll<HTMLButtonElement>('[data-album-item]');
              const next = tiles?.[Math.min(removeIndex.current, tiles.length - 1)];
              if (next) next.focus();
              else
                section.current
                  ?.querySelector<HTMLElement>('[aria-label="Album images"] h3')
                  ?.focus();
            }
          }}
        />
      )}
      {edit && (
        <AlbumForm
          album={album}
          onReload={async () => (await reloadAlbum()).pages[0].album}
          onClose={() => setEdit(false)}
          onSaved={() => setEdit(false)}
        />
      )}
      {picker && <AlbumImagePicker album={album} onClose={() => setPicker(false)} />}
      {editImage && (
        <AlbumImageForm
          album={album}
          onReload={async () => {
            const latest = await reloadAlbum();
            const image = latest.pages
              .flatMap(page => page.images)
              .find(image => image.fileId === editImage.fileId);
            if (!image)
              throw new Error(
                'This image was removed or moved outside the loaded images. Copy your edits before closing this dialog, then reload the album.',
              );
            return { album: latest.pages[0].album, image };
          }}
          image={editImage}
          onClose={() => setEditImage(null)}
        />
      )}
      <AlertDialog
        open={confirmDelete}
        onOpenChange={open => {
          if (!mutation.isPending) setConfirmDelete(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this album?</AlertDialogTitle>
            <AlertDialogDescription>
              The album and its captions will be removed. Your uploaded images stay in All images
              and other albums. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutation.isError && (
            <p role="alert" className="text-destructive">
              {mutation.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Keep album</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={event => {
                event.preventDefault();
                mutation.mutate(
                  { action: 'delete', id, revision: album.revision },
                  { onSuccess: onBack },
                );
              }}
            >
              {mutation.isPending ? 'Deleting…' : 'Delete album'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
