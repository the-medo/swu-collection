import { useEffect, useRef, useState } from 'react';
import { useUserFiles } from '@/api/user-files/useUserFiles.ts';
import { useUploadUserFile } from '@/api/user-files/useUploadUserFile.ts';
import { validateUserImageFiles } from '@/api/user-files/uploadValidation.ts';
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
  const upload = useUploadUserFile();
  const attach = useAlbumMutation();
  const button = useRef<HTMLButtonElement>(null);
  const active = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  useEffect(
    () => () => {
      active.current?.abort();
      onBusy(false);
    },
    [onBusy],
  );
  const uploadFiles = async (files: File[]) => {
    if (!files.length || active.current || attach.isPending) return;
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
    const controller = new AbortController();
    active.current = controller;
    onBusy(true);
    setMessage('');
    let completed = 0;
    let savedFileId: string | null = null;
    let revision = album.revision;
    try {
      validateUserImageFiles(files);
      for (const [index, file] of files.entries()) {
        setProgress({ current: index + 1, total: files.length });
        const saved = await upload.mutateAsync({
          userId: album.userId,
          file,
          signal: controller.signal,
        });
        // A completed upload is durable: finish attaching it even if navigation
        // was explicitly confirmed while its response was arriving.
        savedFileId = saved.id;
        const result = await attach.mutateAsync({
          action: 'add',
          id: album.id,
          input: { revision, fileIds: [saved.id] },
        });
        if (controller.signal.aborted) return;
        revision = result.revision;
        savedFileId = null;
        completed++;
      }
      setMessage(`${completed} ${completed === 1 ? 'image' : 'images'} added to this album.`);
    } catch (error) {
      if (!controller.signal.aborted) {
        setPendingFile(savedFileId);
        setMessage(
          `${completed} added. ${savedFileId ? 'The last image was uploaded to All images, but could not be added to this album. Retry adding it below. ' : ''}${error instanceof Error ? error.message : 'Please try again.'}`,
        );
      }
    } finally {
      active.current = null;
      if (!controller.signal.aborted) {
        setProgress(null);
        onBusy(false);
      }
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
