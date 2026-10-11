import { useRef, useState } from 'react';
import { CloudUpload, Download, RefreshCw } from 'lucide-react';
import {
  useArtistTransferStatus,
  useArtistSnapshots,
  usePublishArtistSnapshot,
  useUploadArtistSnapshot,
  useDownloadArtistExport,
  usePreviewArtistImport,
  useApplyArtistImport,
} from '@/api/admin/artists/useArtistTransfer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ArtistImportMode,
  ArtistSnapshot,
} from '../../../../../../shared/types/artistTransfer';

export function ArtistTransferPage() {
  const status = useArtistTransferStatus();
  const snapshots = useArtistSnapshots(status.data?.storage.configured === true);
  const publish = usePublishArtistSnapshot();
  const upload = useUploadArtistSnapshot();
  const download = useDownloadArtistExport();
  const preview = usePreviewArtistImport();
  const apply = useApplyArtistImport();
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState('');
  const [mode, setMode] = useState<ArtistImportMode>('merge');
  const [uploaded, setUploaded] = useState<ArtistSnapshot[]>([]);
  const [notice, setNotice] = useState('');
  const busy = publish.isPending || upload.isPending || preview.isPending || apply.isPending;
  const configured = status.data?.storage.configured === true;
  const entries = [
    ...new Map(
      [...(snapshots.data?.snapshots ?? []), ...uploaded].map(snapshot => [snapshot.key, snapshot]),
    ).values(),
  ].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const result = preview.data;
  const changed = result?.changes.filter(change => change.action !== 'unchanged') ?? [];
  const error =
    status.error ||
    snapshots.error ||
    publish.error ||
    upload.error ||
    download.error ||
    preview.error ||
    apply.error;

  function resetPreview() {
    preview.reset();
    apply.reset();
    setNotice('');
  }
  function onUploaded(snapshot: ArtistSnapshot) {
    setUploaded(previous => [...previous, snapshot]);
    setSource(snapshot.key);
    preview.reset();
    apply.reset();
    setNotice('Snapshot uploaded to R2. Select it on production to preview and import.');
  }

  if (status.isPending) return <p role="status">Loading artist data…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Artist showcase</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Transfer artist profiles, links and merged credits between development and production.
        </p>
      </div>

      {status.data && (
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-4 text-center">
          {Object.entries(status.data.database).map(([label, value]) => (
            <div key={label}>
              <dd className="text-xl font-semibold tabular-nums">{value}</dd>
              <dt className="text-sm capitalize text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      )}
      {status.data && !configured && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">R2 storage is not configured</p>
          <p className="mt-1">
            Set ARTIST_EXPORT_BUCKET and the R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY
            server variables. Use the same bucket on development and production. JSON downloads are
            available without R2.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="break-words text-sm text-destructive">
          {error.message}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {notice}
        </p>
      )}

      <section className="space-y-3" aria-labelledby="artist-export-title">
        <h3 id="artist-export-title" className="text-base font-semibold">
          Export from this environment
        </h3>
        <p className="text-sm text-muted-foreground">
          Publish the current database as a new snapshot, or upload an existing artist JSON export.
          Each upload creates a separate snapshot.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!configured || busy || !status.data}
            onClick={() => {
              upload.reset();
              publish.reset();
              setNotice('');
              publish.mutate(undefined, { onSuccess: onUploaded });
            }}
          >
            <CloudUpload className="mr-2 size-4" />
            {publish.isPending ? 'Publishing…' : 'Publish database to R2'}
          </Button>
          <Button
            variant="outline"
            disabled={!configured || busy}
            onClick={() => fileInput.current?.click()}
          >
            {upload.isPending ? 'Uploading…' : 'Upload JSON to R2'}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Artist JSON file"
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                publish.reset();
                upload.reset();
                setNotice('');
                upload.mutate(file, { onSuccess: onUploaded });
              }
            }}
          />
          <Button
            variant="outline"
            disabled={!status.data || download.isPending}
            onClick={() => download.mutate()}
          >
            <Download className="mr-2 size-4" /> Download JSON
          </Button>
        </div>
        {configured && (
          <p className="break-all text-xs text-muted-foreground">
            Bucket: {status.data?.storage.bucket}
          </p>
        )}
      </section>

      <section className="space-y-4 border-t pt-5" aria-labelledby="artist-import-title">
        <h3 id="artist-import-title" className="text-base font-semibold">
          Import into this environment
        </h3>
        <div className="space-y-2">
          <Label htmlFor="artist-snapshot">Snapshot</Label>
          <div className="flex min-w-0 gap-2">
            <Select
              value={source}
              disabled={!configured || busy || entries.length === 0}
              onValueChange={value => {
                setSource(value);
                resetPreview();
              }}
            >
              <SelectTrigger id="artist-snapshot" className="min-w-0 flex-1">
                <SelectValue placeholder="Choose a snapshot" />
              </SelectTrigger>
              <SelectContent>
                {entries.map(snapshot => (
                  <SelectItem key={snapshot.key} value={snapshot.key}>
                    {new Date(snapshot.uploadedAt).toLocaleString()} ·{' '}
                    {(snapshot.bytes / 1024).toFixed(1)} KiB · {snapshot.key.slice(-13, -5)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh snapshots"
              disabled={!configured || busy || snapshots.isFetching}
              onClick={() => {
                void snapshots.refetch();
              }}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
          {snapshots.isPending && configured && (
            <p className="text-sm text-muted-foreground">Loading snapshots…</p>
          )}
          {source && <p className="break-all text-xs text-muted-foreground">{source}</p>}
          {configured && snapshots.isSuccess && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No R2 snapshots yet. Publish one from development first.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="artist-import-mode">Import mode</Label>
          <Select
            value={mode}
            disabled={busy}
            onValueChange={value => {
              setMode(value as ArtistImportMode);
              resetPreview();
            }}
          >
            <SelectTrigger id="artist-import-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merge">Merge with existing data</SelectItem>
              <SelectItem value="replace">Replace included profiles</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {mode === 'merge'
              ? 'Adds missing links and merged credits. Fills empty biographies and preserves existing names and biographies.'
              : 'Overwrites names, biographies and links for included profiles. Replaces merged credits for included artists. Other profiles stay unchanged.'}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={!source || !configured || busy || !status.data}
          onClick={() => {
            resetPreview();
            preview.mutate({
              source: { kind: 'r2', key: source },
              mode,
            });
          }}
        >
          {preview.isPending ? 'Preparing preview…' : 'Preview import'}
        </Button>

        {result && (
          <div className="space-y-4 rounded-lg border p-4" aria-label="Import preview">
            <div>
              <h4 className="font-semibold">Import preview</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Exported {new Date(result.exportedAt).toLocaleString()}
              </p>
              <p className="mt-1 text-sm">
                {result.summary.profiles} profiles · {result.summary.links} links ·{' '}
                {result.summary.aliases} merged credits in this snapshot
              </p>
            </div>
            <p className="text-sm">
              {result.changes.filter(change => change.action === 'create').length} new profiles ·{' '}
              {result.changes.filter(change => change.action === 'update').length} updated ·{' '}
              {result.changes.filter(change => change.action === 'unchanged').length} unchanged ·{' '}
              {result.aliasChanges.length} credit changes
            </p>
            {changed.length > 0 || result.aliasChanges.length > 0 ? (
              <>
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">Review changes</summary>
                  <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto break-words">
                    {changed.map(change => (
                      <li key={change.key}>
                        {change.action === 'create' ? 'Create' : 'Update'}: {change.key} (
                        {change.links} links)
                      </li>
                    ))}
                    {result.aliasChanges.map(change => (
                      <li key={`alias-${change.key}`}>
                        {change.canonicalKey
                          ? `${change.key} → ${change.canonicalKey}`
                          : `Unmerge: ${change.key}`}
                      </li>
                    ))}
                  </ul>
                </details>
                <Button
                  disabled={busy || apply.isError}
                  onClick={() => {
                    apply.mutate(
                      {
                        source: result.source,
                        mode: result.mode,
                        sha256: result.sha256,
                        expectedState: result.expectedState,
                      },
                      {
                        onSuccess: () => {
                          preview.reset();
                          setNotice('Artist data imported successfully.');
                        },
                      },
                    );
                  }}
                >
                  {apply.isPending ? 'Importing…' : 'Apply import'}
                </Button>
                {apply.isError && (
                  <p className="text-sm text-muted-foreground">
                    Preview the import again before retrying.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Everything in this snapshot is already up to date.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
