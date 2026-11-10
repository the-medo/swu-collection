import { Link } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import { useCollectionImports } from '@/api/collections/useCollectionImportReview.ts';
import { Button } from '@/components/ui/button.tsx';

/** Mounted only for the collection owner, outside the collapsible card tools. */
export default function CollectionImportReviewNotice({ collectionId }: { collectionId: string }) {
  const query = useCollectionImports(collectionId);
  const unfinished = query.data?.data.filter(report => report.pendingRows > 0) ?? [];
  if (query.error)
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Could not check unfinished imports.
        <Button size="sm" variant="link" onClick={() => void query.refetch()}>
          Retry
        </Button>
        <Link to="/collections/import" search={{ collectionId }} className="underline">
          Import history
        </Link>
      </div>
    );
  const next = unfinished[0];
  if (!next) return null;
  return (
    <section
      aria-label="Unfinished import reviews"
      className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <ClipboardList className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-sm font-medium">Your import still has rows to review</p>
            <p className="text-xs text-muted-foreground">
              {next.fileName || 'Pasted CSV'} · {next.pendingRows} source{' '}
              {next.pendingRows === 1 ? 'row' : 'rows'} left
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link
            to="/collections/$collectionId/imports/$importId"
            params={{ collectionId, importId: next.id }}
          >
            Continue import review
          </Link>
        </Button>
      </div>
      {unfinished.length > 1 && (
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Other unfinished imports shown ({unfinished.length - 1})
          </summary>
          <div className="mt-2 flex flex-col items-start gap-2">
            {unfinished.slice(1).map(report => (
              <Link
                key={report.id}
                to="/collections/$collectionId/imports/$importId"
                params={{ collectionId, importId: report.id }}
                className="text-xs underline"
              >
                {report.fileName || 'Pasted CSV'} · {new Date(report.createdAt).toLocaleString()} ·{' '}
                {report.pendingRows} rows left
              </Link>
            ))}
          </div>
        </details>
      )}
      {query.data?.hasMore && (
        <Link
          to="/collections/import"
          search={{ collectionId }}
          className="inline-block text-xs underline"
        >
          View all import history
        </Link>
      )}
    </section>
  );
}
