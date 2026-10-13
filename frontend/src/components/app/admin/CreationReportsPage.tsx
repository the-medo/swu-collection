import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { creatorKeys, hubApi, useHubQuery } from '@/api/creators';
import { useReviewCreationReport } from '@/api/creators/reports.ts';
import { useRole } from '@/hooks/useRole.ts';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Status } from '../creators/CreatorControls.tsx';
import type { CreationReportList } from '../../../../../shared/creators/reports.ts';

export function CreationReportsPage() {
  const { creationReportPage: page, creationReportStatus: status } = useSearch({
    from: '/_authenticated/admin',
  });
  const navigate = useNavigate({ from: '/admin' });
  const hasRole = useRole();
  const query = useHubQuery(
    creatorKeys.reportList(status, page),
    () => hubApi.reports(status, page),
    hasRole('admin'),
    true,
  );
  const mutation = useReviewCreationReport();
  const [selected, setSelected] = useState<CreationReportList['items'][number] | null>(null);
  const decide = async (
    report: CreationReportList['items'][number],
    action: 'dismiss' | 'unpublish',
  ) => {
    try {
      await mutation.mutateAsync({
        id: report.id,
        action,
        publishedRevision: report.publishedRevision,
      });
      setSelected(null);
    } catch {
      /* Keep the error visible and refresh stale decisions through the mutation hook. */
    }
  };
  return (
    <div className="grid gap-4">
      <div>
        <h2>Video reports</h2>
        <p className="text-sm text-muted-foreground">
          Review videos reported as unrelated to Star Wars Unlimited.
        </p>
      </div>
      <div className="flex gap-2">
        {(['open', 'resolved'] as const).map(value => (
          <Button
            key={value}
            variant={status === value ? 'default' : 'outline'}
            onClick={() =>
              void navigate({
                search: previous => ({
                  ...previous,
                  creationReportStatus: value,
                  creationReportPage: 1,
                }),
              })
            }
          >
            {value === 'open' ? 'Open reports' : 'Resolved reports'}
          </Button>
        ))}
      </div>
      {!query.data && <Status loading={query.isPending} error={query.error} />}
      {query.data?.items.length === 0 && (
        <p className="text-muted-foreground">No {status} video reports.</p>
      )}
      {mutation.isError && !selected && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {query.data?.items.map(report => (
        <article key={report.id} className="grid min-w-0 gap-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="break-words">{report.title}</h3>
              <p className="text-sm text-muted-foreground">
                {report.creatorName} · Reported {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge variant="outline">{report.status}</Badge>
          </div>
          {report.details && (
            <p className="whitespace-pre-wrap break-words text-sm">{report.details}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {report.publishedRevision !== null && (
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/content/$creationId"
                  params={{ creationId: report.creationId }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View creation
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer">
                Original video
              </a>
            </Button>
            {report.status === 'open' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => void decide(report, 'dismiss')}
                >
                  Dismiss report
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.reset();
                    setSelected(report);
                  }}
                >
                  {report.publishedRevision === null ? 'Resolve as non-SWU' : 'Unpublish video'}
                </Button>
              </>
            )}
          </div>
        </article>
      ))}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          disabled={page === 1 || query.isFetching}
          onClick={() =>
            void navigate({ search: previous => ({ ...previous, creationReportPage: page - 1 }) })
          }
        >
          Previous
        </Button>
        <span className="text-sm">Page {page}</span>
        <Button
          variant="outline"
          disabled={!query.data?.hasMore || query.isFetching}
          onClick={() =>
            void navigate({ search: previous => ({ ...previous, creationReportPage: page + 1 }) })
          }
        >
          Next
        </Button>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={open => {
          if (!open && !mutation.isPending) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve as non-SWU?</DialogTitle>
            <DialogDescription>
              This removes the video from public discovery and resolves its open reports. The
              creator’s draft and history are retained.
            </DialogDescription>
          </DialogHeader>
          <p className="break-words">{selected?.title}</p>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => selected && void decide(selected, 'unpublish')}
            >
              {mutation.isPending ? 'Saving…' : 'Confirm non-SWU'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
