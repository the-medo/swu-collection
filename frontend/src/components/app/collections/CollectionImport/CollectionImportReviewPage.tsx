import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Check, ClipboardList } from 'lucide-react';
import { BrowseHeader, BrowsePage } from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import { useCollectionImportReview } from '@/api/collections/useCollectionImportReview.ts';
import { groupImportReviewRows } from './importReviewGroups.ts';
import ImportReviewRow from './ImportReviewRow.tsx';
import FloatingCardImport from './FloatingCardImport.tsx';

const pageSize = 50;

export default function CollectionImportReviewPage({
  collectionId,
  importId,
}: {
  collectionId: string;
  importId: string;
}) {
  const query = useCollectionImportReview(collectionId, importId);
  const [filter, setFilter] = useState('open');
  const [page, setPage] = useState(1);
  const report = query.data;
  const groups = useMemo(() => groupImportReviewRows(report?.rows ?? []), [report?.rows]);
  const openCount = groups.filter(group => !group.completed).length;
  const addedCopies = groups.reduce((sum, group) => sum + (group.resolvedCount ?? 0), 0);
  const filtered = groups.filter(
    group => filter === 'all' || (filter === 'completed' ? group.completed : !group.completed),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <BrowsePage>
      <Helmet title="Collection import review | SWUBase" />
      <BrowseHeader
        eyebrow="Collection import"
        icon={ClipboardList}
        title="Review import"
        description={report ? report.collectionTitle : 'Loading your saved import report…'}
      >
        <Button asChild variant="outline">
          <Link to="/collections/import" search={{ collectionId }}>
            Import history
          </Link>
        </Button>
        <Button asChild>
          <Link to="/collections/$collectionId" params={{ collectionId }}>
            View collection
          </Link>
        </Button>
      </BrowseHeader>
      {query.isPending && <p role="status">Loading import…</p>}
      {query.error && (
        <div role="alert" className="space-y-3 rounded-xl border p-5">
          <p className="text-destructive">{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {report && (
        <>
          <section className="space-y-3 rounded-xl border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0! border-0! p-0! text-sm! font-semibold!">
                {report.import.fileName || 'Pasted CSV'}
              </h2>
              <span className="text-xs text-muted-foreground">
                {new Date(report.import.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['CSV rows', report.import.totalRows],
                ['Copies imported', report.import.importedCopies + addedCopies],
                ['Items for review', openCount],
                ['Completed items', groups.length - openCount],
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="text-xl font-semibold">{Number(value).toLocaleString()}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {report.import.importedRows.toLocaleString()} rows imported automatically ·{' '}
              {report.import.problemRows.toLocaleString()} source rows saved for review
              {addedCopies > 0 &&
                ` · ${addedCopies.toLocaleString()} copies added from duplicate groups`}
              .
            </p>
          </section>
          <FloatingCardImport collectionId={collectionId} title={report.collectionTitle} />
          {groups.length === 0 ? (
            <div className="rounded-xl border p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Check className="size-5" /> All rows imported
              </h2>
              <p className="text-muted-foreground">There are no problems to review.</p>
            </div>
          ) : (
            <section className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="m-0! border-0! p-0! text-lg! font-semibold!">Rows for review</h2>
                  <p className="text-xs text-muted-foreground">
                    Duplicate counts are shown separately. Save adds the final count once and
                    completes the group.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="import-row-filter" className="text-xs">
                    Show
                  </Label>
                  <select
                    id="import-row-filter"
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                    value={filter}
                    onChange={event => {
                      setFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="open">Needs review ({openCount})</option>
                    <option value="completed">Completed ({groups.length - openCount})</option>
                    <option value="all">All ({groups.length})</option>
                  </select>
                </div>
              </div>
              {visible.length === 0 ? (
                <p className="rounded-xl border p-5">
                  {filter === 'open'
                    ? 'All review items have been marked completed.'
                    : 'No rows in this view.'}
                </p>
              ) : (
                <div className="min-w-0 overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-xs">Card / problem</TableHead>
                        {report.import.headers.map((header, i) => (
                          <TableHead className="h-8 text-xs" key={i}>
                            {header || `Column ${i + 1}`}
                          </TableHead>
                        ))}
                        <TableHead className="h-8 text-xs">SWUDB</TableHead>
                        <TableHead className="h-8 text-xs">Final count / review</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map(group => (
                        <ImportReviewRow
                          key={group.id}
                          group={group}
                          headers={report.import.headers}
                          collectionId={collectionId}
                          importId={importId}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Expand a row to see every original CSV field and source line. Mark completed changes
                only review status; manually added cards remain in your collection.
              </p>
              {filtered.length > pageSize && (
                <nav
                  aria-label="Import rows pagination"
                  className="flex items-center justify-end gap-3"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </section>
          )}
        </>
      )}
    </BrowsePage>
  );
}
