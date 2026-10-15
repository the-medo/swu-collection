import { useUserFiles } from '@/api/user-files/useUserFiles.ts';
import { Button } from '@/components/ui/button.tsx';
import { formatBytes } from '../pages/settings/uploads/formatBytes.ts';
import { HardDrive } from 'lucide-react';
import { albumTheme } from './albumStyles.ts';

export function UserStorageMeter({ userId }: { userId: string }) {
  const query = useUserFiles(userId, 0);
  const data = query.data;
  return (
    <div
      className={`${albumTheme} space-y-2 rounded-2xl border border-[var(--album-border)] bg-[var(--album-tint)] px-5 py-4 text-xs`}
    >
      {data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[var(--album-accent)]">
              <HardDrive className="size-4" />
              <strong>{formatBytes(data.usedBytes)}</strong> of {formatBytes(data.quotaBytes)} used
            </span>
            <span>{data.fileCount} images in your library</span>
          </div>
          <progress
            aria-label="Image storage used"
            className="block h-1.5 w-full overflow-hidden rounded-full accent-[var(--album-accent)]"
            value={Math.min(data.usedBytes, data.quotaBytes)}
            max={Math.max(data.quotaBytes, 1)}
          />
          <p className="text-muted-foreground">
            Images shared across albums count once toward your storage.
          </p>
          {data.usedBytes >= data.quotaBytes && (
            <p role="status">Storage is full. You can still organize and share existing images.</p>
          )}
          {!data.uploadsEnabled && <p role="status">New uploads are currently unavailable.</p>}
        </>
      ) : query.isError ? (
        <div role="alert">
          {query.error.message}{' '}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <p role="status">Checking available storage…</p>
      )}
    </div>
  );
}
