import { useState } from 'react';
import { Download, FileJson, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApplyCreatorImport, usePreviewCreatorImport } from '@/api/admin/useCreatorImport';
import {
  creatorImportSchema,
  MAX_CREATOR_IMPORT_BYTES,
  type CreatorImport,
  type CreatorImportRow,
} from '../../../../../shared/creators/imports';

function downloadTemplate() {
  const template = {
    kind: 'swubase-creator-import',
    schemaVersion: 1,
    creators: [
      {
        slug: 'example-creator',
        name: 'Example Creator',
        tagline: '',
        bio: '',
        avatarUrl: '',
        bannerUrl: '',
        languages: ['en'],
        specialties: [],
        links: [
          {
            label: 'YouTube',
            url: 'https://www.youtube.com/channel/UC_REPLACE_WITH_REAL_CHANNEL_ID',
            kind: 'social',
          },
        ],
      },
    ],
    videos: [],
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(template, null, 2) + '\n'], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'creator-import-template.json';
  a.click();
  URL.revokeObjectURL(url);
}

function PreviewRows({ title, rows }: { title: string; rows: CreatorImportRow[] }) {
  if (!rows.length) return null;
  // Conflicts come first so a large video inventory cannot bury an actionable error.
  const visible = [...rows]
    .sort((a, b) => Number(b.status === 'conflict') - Number(a.status === 'conflict'))
    .slice(0, 100);
  return (
    <section className="min-w-0 space-y-2">
      <h3 className="text-base font-semibold">
        {title} ({rows.length})
      </h3>
      <ul className="max-h-96 divide-y overflow-y-auto rounded-lg border">
        {visible.map(row => (
          <li
            key={row.key}
            className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm"
          >
            <div className="min-w-0 flex-1 basis-48 break-words">
              <div className="font-medium">{row.label}</div>
              <div className="text-muted-foreground">{row.reason}</div>
            </div>
            <Badge variant={row.status === 'conflict' ? 'destructive' : 'secondary'}>
              {
                { insert: 'New profile', queue: 'Queue video', skip: 'Skip', conflict: 'Conflict' }[
                  row.status
                ]
              }
            </Badge>
          </li>
        ))}
      </ul>
      {rows.length > visible.length && (
        <p className="text-xs text-muted-foreground">
          Showing the first 100 entries, with conflicts first. The summary includes the entire file.
        </p>
      )}
    </section>
  );
}

export function CreatorImportsPage() {
  const preview = usePreviewCreatorImport();
  const apply = useApplyCreatorImport();
  const [payload, setPayload] = useState<CreatorImport | null>(null);
  const [filename, setFilename] = useState('');
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const busy = reading || preview.isPending || apply.isPending;
  const result = preview.data;
  const error = fileError || preview.error?.message || apply.error?.message;

  async function readFile(file?: File) {
    setPayload(null);
    setFilename('');
    setFileError('');
    preview.reset();
    apply.reset();
    if (!file) return;
    setReading(true);
    try {
      if (file.size > MAX_CREATOR_IMPORT_BYTES)
        throw new Error('Choose a JSON file smaller than 5 MiB.');
      let value: unknown;
      try {
        value = JSON.parse(await file.text());
      } catch {
        throw new Error('This file is not valid JSON.');
      }
      const parsed = creatorImportSchema.safeParse(value);
      if (!parsed.success)
        throw new Error(
          parsed.error.issues
            .slice(0, 5)
            .map(issue => `${issue.path.join('.') || 'Import'}: ${issue.message}`)
            .join('\n'),
        );
      setPayload(parsed.data);
      setFilename(file.name);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Could not read this file.');
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h2 className="text-xl font-semibold">Creator imports</h2>
          <p className="text-sm text-muted-foreground">
            Upload a JSON file to add creator profiles or queue YouTube videos. Preview every import
            before applying it.
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="mr-2 size-4" />
          Download template
        </Button>
      </div>
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <Label htmlFor="creator-import-file" className="flex items-center gap-2">
          <FileJson className="size-4" />
          Import file
        </Label>
        <Input
          id="creator-import-file"
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={event => void readFile(event.target.files?.[0])}
        />
        <p className="text-sm text-muted-foreground">
          Up to 200 creators and 5,000 videos per file (5 MiB). Profiles are created without user
          accounts. Existing profiles and videos are preserved.
        </p>
        <Button
          disabled={!payload || busy}
          onClick={() => {
            apply.reset();
            preview.mutate(payload!);
          }}
        >
          {preview.isPending ? 'Preparing preview…' : 'Preview import'}
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="whitespace-pre-wrap break-words rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          {error}
        </p>
      )}
      {apply.data && (
        <p
          role="status"
          className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm"
        >
          Imported {apply.data.profiles} creator profiles and queued {apply.data.queued} videos.
          Skipped {apply.data.skipped} existing or paused entries. Queued videos will appear after
          background processing.
        </p>
      )}
      {result && !apply.data && (
        <div className="min-w-0 space-y-5">
          <h3 className="break-all text-base font-semibold">Preview: {filename}</h3>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ['New profiles', result.summary.profiles],
                ['Videos to queue', result.summary.queued],
                ['Skipped', result.summary.skipped],
                ['Conflicts', result.summary.conflicts],
              ] as const
            ).map(([label, count]) => (
              <div key={label} className="rounded-lg bg-muted/50 p-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
          <PreviewRows title="Creators" rows={result.creators} />
          <PreviewRows title="Videos" rows={result.videos} />
          {result.summary.conflicts > 0 && (
            <p className="text-sm text-destructive">
              Resolve the conflicts in the JSON file, then upload it again. Nothing has been
              imported.
            </p>
          )}
          {result.summary.queued > 0 && (
            <p className="text-sm text-muted-foreground">
              The worker checks each video against its channel, classifies SWU content, and
              publishes eligible videos. Normal processing limits and costs apply.
            </p>
          )}
          <Button
            disabled={
              busy ||
              !!apply.error ||
              result.summary.conflicts > 0 ||
              result.summary.profiles + result.summary.queued === 0
            }
            onClick={() => apply.mutate({ payload: payload!, fingerprint: result.fingerprint })}
          >
            <Upload className="mr-2 size-4" />
            {apply.isPending ? 'Importing…' : 'Import profiles and queue videos'}
          </Button>
          {apply.error && (
            <p className="text-sm text-muted-foreground">Preview the file again before retrying.</p>
          )}
        </div>
      )}
    </div>
  );
}
