import { useEffect, useRef, useState } from 'react';
import { useUploadUserFile } from './useUploadUserFile.ts';
import { validateUserImageFiles } from './uploadValidation.ts';
import type { UserFile } from '../../../../types/UserFile.ts';

type UploadQueueResult =
  | { status: 'complete'; completed: number }
  | { status: 'failed'; completed: number; savedFile: UserFile | null; error: unknown }
  | { status: 'busy' | 'cancelled' | 'empty' };

// Each mounted upload surface owns one serial queue. Leaving it cancels the
// active request and remaining files, while completed uploads remain in the library.
export function useUserImageUploadQueue(userId: string, onBusy: (busy: boolean) => void) {
  const upload = useUploadUserFile();
  const active = useRef<AbortController | null>(null);
  const busyCallback = useRef(onBusy);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  useEffect(() => {
    busyCallback.current = onBusy;
  }, [onBusy]);
  useEffect(
    () => () => {
      active.current?.abort();
      busyCallback.current(false);
    },
    [],
  );

  const run = async (
    files: File[],
    afterUpload?: (saved: UserFile) => Promise<void>,
  ): Promise<UploadQueueResult> => {
    if (!files.length) return { status: 'empty' };
    // A ref closes the gap before React renders disabled controls.
    if (active.current) return { status: 'busy' };
    const controller = new AbortController();
    active.current = controller;
    busyCallback.current(true);
    let completed = 0;
    let savedFile: UserFile | null = null;
    try {
      validateUserImageFiles(files);
      for (const [index, file] of files.entries()) {
        if (controller.signal.aborted) return { status: 'cancelled' };
        setProgress({ current: index + 1, total: files.length });
        savedFile = await upload.mutateAsync({ userId, file, signal: controller.signal });
        // Finish attaching a durable upload even when navigation was confirmed
        // while its response arrived. Attachment failure can be retried without reuploading.
        await afterUpload?.(savedFile);
        savedFile = null;
        completed++;
      }
      return controller.signal.aborted
        ? { status: 'cancelled' }
        : { status: 'complete', completed };
    } catch (error) {
      return controller.signal.aborted
        ? { status: 'cancelled' }
        : { status: 'failed', completed, savedFile, error };
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) {
        setProgress(null);
        busyCallback.current(false);
      }
    }
  };
  return { progress, run, isRunning: () => !!active.current };
}
