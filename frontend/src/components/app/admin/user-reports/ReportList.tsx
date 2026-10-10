import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import type { ReportPage } from '../../../../../../shared/types/userReportModeration';

export function ReportPagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize && page === 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page * pageSize >= total}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
export function ReportList({ data, onPage }: { data: ReportPage; onPage: (page: number) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{data.total} reports · Newest first</p>
      {!data.reports.length && (
        <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          No reports found.
        </p>
      )}
      {data.reports.map(report => (
        <div key={report.id} className="min-w-0 space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={report.status === 'open' ? 'warning' : 'secondary'}>
              {report.status === 'open' ? 'Open' : 'Resolved'}
            </Badge>
            <time className="text-xs text-muted-foreground" dateTime={report.createdAt}>
              {new Date(report.createdAt).toLocaleString()}
            </time>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <UserDisplay
              user={{
                id: report.reporterUserId,
                displayName: report.reporterDisplayName ?? 'Unknown user',
                image: report.reporterImage,
              }}
            />
            reported
            <UserDisplay
              user={{
                id: report.reportedUserId,
                displayName: report.reportedDisplayName ?? 'Unknown user',
                image: report.reportedImage,
              }}
            />
          </div>
          <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {report.description}
          </p>
          <Link
            to="/admin"
            search={previous => ({ ...previous, page: 'user-reports', reportId: report.id })}
            className="rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open report
          </Link>
        </div>
      ))}
      <ReportPagination {...data} onPage={onPage} />
    </div>
  );
}
export function ReportQueryError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm">
      <p>{message}</p>
      <Button variant="link" className="px-0" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
