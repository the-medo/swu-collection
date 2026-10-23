import { useRef, useState } from 'react';
import { useUserFiles } from '@/api/user-files/useUserFiles.ts';
import { useUserImageUploadQueue } from '@/api/user-files/useUserImageUploadQueue.ts';
import { useAlbumMutation } from '@/api/user-albums/useAlbumMutation.ts';
import { UploadDropzone } from '../pages/settings/uploads/UploadDropzone.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { UserAlbum } from '../../../../../types/UserAlbum.ts';

export function AlbumUploader({
  album,
  onBusy,
  editorBusy,
}: {
  album: UserAlbum;
  onBusy(busy: boolean): void;
  editorBusy: boolean;
}) {
  const usage = useUserFiles(album.userId, 0).data;
  const queue = useUserImageUploadQueue(album.userId, onBusy);
  const { progress } = queue;
  const attach = useAlbumMutation();
  const button = useRef<HTMLButtonElement>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const uploadFiles = async (files: File[]) => {
    if (!files.length || queue.isRunning() || attach.isPending) return;
    if (editorBusy) {
      setMessage('Wait for the album to finish updating before uploading more images.');
      return;
    }
    if (pendingFile) {
      setMessage('Retry adding the saved image before uploading more.');
      return;
    }
    if (!usage?.uploadsEnabled || usage.usedBytes >= usage.quotaBytes) {
      setMessage(
        usage && usage.usedBytes >= usage.quotaBytes
          ? 'Storage is full. Add existing images or delete an upload to make room.'
          : 'Uploads are currently unavailable.',
      );
      return;
    }
    setMessage('');
    let revision = album.revision;
    const result = await queue.run(files, async saved => {
      const attached = await attach.mutateAsync({
        action: 'add',
        id: album.id,
        input: { revision, fileIds: [saved.id] },
      });
      revision = attached.revision;
    });
    if (result.status === 'complete') {
      setMessage(
        `${result.completed} ${result.completed === 1 ? 'image' : 'images'} added to this album.`,
      );
    } else if (result.status === 'failed') {
      setPendingFile(result.savedFile?.id ?? null);
      setMessage(
        `${result.completed} added. ${result.savedFile ? 'The last image was uploaded to All images, but could not be added to this album. Retry adding it below. ' : ''}${result.error instanceof Error ? result.error.message : 'Please try again.'}`,
      );
    }
  };
  return (
    <div className="space-y-3">
      <UploadDropzone
        variant="album"
        disabled={
          editorBusy ||
          !usage?.uploadsEnabled ||
          usage.usedBytes >= usage.quotaBytes ||
          !!progress ||
          !!pendingFile ||
          attach.isPending
        }
        progress={progress}
        buttonRef={button}
        onFiles={files => void uploadFiles(files)}
      />
      {message && (
        <p role="status" className="px-5 pb-4 text-sm">
          {message}
        </p>
      )}
      {pendingFile && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          <Button
            disabled={attach.isPending || editorBusy}
            onClick={() => {
              onBusy(true);
              attach.mutate(
                {
                  action: 'add',
                  id: album.id,
                  input: { revision: album.revision, fileIds: [pendingFile] },
                },
                {
                  onSuccess: () => {
                    setPendingFile(null);
                    setMessage('Saved image added to the album.');
                  },
                  onError: error =>
                    setMessage(`The image is still saved in All images. ${error.message}`),
                  onSettled: () => onBusy(false),
                },
              );
            }}
          >
            {attach.isPending ? 'Adding…' : 'Retry adding saved image'}
          </Button>
          <Button
            variant="outline"
            disabled={attach.isPending || editorBusy}
            onClick={() => {
              setPendingFile(null);
              setMessage('You can add saved uploads later using Add existing images.');
            }}
          >
            Keep in All images
          </Button>
        </div>
      )}
    </div>
  );
}
