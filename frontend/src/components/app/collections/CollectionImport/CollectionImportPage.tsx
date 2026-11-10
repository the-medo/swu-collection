import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { FileUp, History } from 'lucide-react';
import { BrowseHeader, BrowsePage } from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useGetUserCollections } from '@/api/user/useGetUserCollections.ts';
import { useCollectionImport } from '@/api/collections/useCollectionImport.ts';
import { useCollectionImports } from '@/api/collections/useCollectionImportReview.ts';
import {
  collectionImportMaxBytes,
  type CollectionCsvImportRequest,
} from '../../../../../../types/CollectionImport.ts';

function ImportHistory({ collectionId }: { collectionId: string }) {
  const [page, setPage] = useState(0);
  const history = useCollectionImports(collectionId, page);
  return (
    <section className="space-y-3 rounded-xl border p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <History className="size-5" /> Import history
      </h2>
      {history.isPending && <p role="status">Loading imports…</p>}
      {history.error && (
        <p role="alert" className="text-destructive">
          {history.error.message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Unfinished imports are shown first.</p>
      {history.data?.data.length === 0 && (
        <p className="text-muted-foreground">No imports on this page.</p>
      )}
      {history.data?.data.map(report => (
        <Link
          key={report.id}
          to="/collections/$collectionId/imports/$importId"
          params={{ collectionId, importId: report.id }}
          className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 hover:bg-muted"
        >
          <span>
            {report.fileName || 'Pasted CSV'} · {new Date(report.createdAt).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            {report.importedCopies + report.resolvedCopies} copies imported ·{' '}
            {report.pendingRows > 0
              ? `${report.pendingRows} rows left to review`
              : 'Review complete'}
          </span>
        </Link>
      ))}
      {(page > 0 || history.data?.hasMore) && (
        <nav aria-label="Import history pages" className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0 || history.isPending}
            onClick={() => setPage(page - 1)}
          >
            Previous imports
          </Button>
          <span className="text-xs">Page {page + 1}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={!history.data?.hasMore || history.isPending}
            onClick={() => setPage(page + 1)}
          >
            More imports
          </Button>
        </nav>
      )}
    </section>
  );
}

export default function CollectionImportPage({ collectionId }: { collectionId?: string }) {
  const user = useUser();
  const collections = useGetUserCollections(user?.id);
  const mutation = useCollectionImport();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string>();
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  const form = useForm({
    defaultValues: { destinationId: collectionId ?? '', title: 'Imported collection', csv: '' },
    onSubmit: async ({ value }) => {
      if (mutation.isPending || reading || fileError) return;
      const destination: CollectionCsvImportRequest['destination'] = value.destinationId
        ? { type: 'existing', collectionId: value.destinationId }
        : { type: 'new', title: value.title.trim() };
      const key = JSON.stringify({ csv: value.csv, destination, fileName });
      if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
      try {
        const report = await mutation.mutateAsync({
          requestId: request.current.id,
          csv: value.csv,
          destination,
          fileName,
        });
        await navigate({
          to: '/collections/$collectionId/imports/$importId',
          params: { collectionId: report.collectionId, importId: report.id },
        });
      } catch {
        /* The mutation error is shown below; retain the request ID for safe retries. */
      }
    },
  });
  return (
    <BrowsePage>
      <Helmet title="Import collection | SWUBase" />
      <BrowseHeader
        eyebrow="Your card library"
        icon={FileUp}
        title="Import from SWUDB"
        description="Upload your CSV. We’ll add valid cards and save every problem row for you to review."
      >
        <Button variant="outline" asChild>
          <Link to="/collections/your">Your collections</Link>
        </Button>
      </BrowseHeader>
      <form
        className="max-w-4xl space-y-5 rounded-xl border p-5"
        onSubmit={event => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <fieldset disabled={mutation.isPending || reading} className="space-y-5">
          <form.Field name="destinationId">
            {field => (
              <div className="space-y-2">
                <Label htmlFor="import-destination">Destination</Label>
                <select
                  id="import-destination"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={field.state.value}
                  onChange={event => field.handleChange(event.target.value)}
                >
                  <option value="">Create a new collection</option>
                  {collectionId &&
                    !collections.data?.collections.some(c => c.id === collectionId) && (
                      <option value={collectionId}>Current collection</option>
                    )}
                  {collections.data?.collections
                    .filter(c => c.userId === user?.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
                {collections.error && (
                  <p className="text-sm text-destructive">
                    Could not load your existing collections.{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => void collections.refetch()}
                    >
                      Retry
                    </button>
                  </p>
                )}
              </div>
            )}
          </form.Field>
          <form.Subscribe selector={state => state.values.destinationId}>
            {destinationId =>
              !destinationId && (
                <form.Field name="title">
                  {field => (
                    <div className="space-y-2">
                      <Label htmlFor="import-title">New collection name</Label>
                      <Input
                        id="import-title"
                        value={field.state.value}
                        onChange={event => field.handleChange(event.target.value)}
                        required
                        minLength={3}
                        maxLength={255}
                      />
                      <p className="text-xs text-muted-foreground">
                        The new collection will be private. You can change its settings afterwards.
                      </p>
                    </div>
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>
          <div className="space-y-2">
            <Label htmlFor="import-file">CSV file</Label>
            <Input
              id="import-file"
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={async event => {
                const file = event.target.files?.[0];
                if (!file) return;
                setFileError('');
                setFileName(undefined);
                if (file.size > collectionImportMaxBytes) {
                  setFileError('Choose a CSV smaller than 2 MiB.');
                  return;
                }
                setReading(true);
                try {
                  form.setFieldValue('csv', await file.text());
                  setFileName(file.name);
                } catch {
                  setFileError('Could not read this file. Try selecting it again.');
                } finally {
                  setReading(false);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Up to 2 MiB or 10,000 rows. Export the collection CSV from SWUDB’s Bulk Actions.
            </p>
          </div>
          <form.Field name="csv">
            {field => (
              <div className="space-y-2">
                <Label htmlFor="import-csv">CSV contents</Label>
                <Textarea
                  id="import-csv"
                  rows={9}
                  className="font-mono text-xs"
                  placeholder="Set,CardNumber,Count,IsFoil,Stamp"
                  value={field.state.value}
                  onChange={event => {
                    field.handleChange(event.target.value);
                    setFileError('');
                    setFileName(undefined);
                  }}
                  required
                />
              </div>
            )}
          </form.Field>
        </fieldset>
        <p className="text-sm text-muted-foreground">
          Every row in a duplicate group is skipped. Unmatched and invalid rows are also saved for
          review. Other valid rows are added to the destination; existing card quantities are
          increased.
        </p>
        {(fileError || mutation.error) && (
          <p role="alert" className="text-sm text-destructive">
            {fileError || mutation.error?.message}
          </p>
        )}
        <form.Subscribe selector={state => state.values}>
          {values => (
            <Button
              type="submit"
              disabled={
                reading ||
                !!fileError ||
                mutation.isPending ||
                !values.csv.trim() ||
                (!values.destinationId && values.title.trim().length < 3)
              }
            >
              <FileUp className="size-4" />
              {mutation.isPending
                ? 'Importing…'
                : reading
                  ? 'Reading file…'
                  : 'Import and review results'}
            </Button>
          )}
        </form.Subscribe>
      </form>
      <form.Subscribe selector={state => state.values.destinationId}>
        {destinationId =>
          destinationId && <ImportHistory key={destinationId} collectionId={destinationId} />
        }
      </form.Subscribe>
    </BrowsePage>
  );
}
