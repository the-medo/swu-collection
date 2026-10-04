import { useAdminReport } from '@/api/user-reports/useAdminReport';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportQueryError } from './ReportList';
import { RestrictionBadge, UserReportHistory } from './UserReportHistory';
import { ModerationHistory } from './ModerationHistory';
import { ReportDecisionForm } from './ReportDecisionForm';
import { Helmet } from 'react-helmet-async';

export function ReportDetailView({ reportId }: { reportId: string }) {
  const query = useAdminReport(reportId);
  if (query.isPending) return <p role="status">Loading report…</p>;
  if (query.isError)
    return <ReportQueryError message={query.error.message} retry={() => void query.refetch()} />;
  const { report, reported, reporter, actions } = query.data;
  return (
    <div className="space-y-5">
      <Helmet title="Review user report | SWUBase" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Report detail</h2>
        <Button
          size="sm"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={report.status === 'open' ? 'warning' : 'secondary'}>
            {report.status === 'open' ? 'Open' : 'Resolved'}
          </Badge>
          <time className="text-xs text-muted-foreground" dateTime={report.createdAt}>
            {new Date(report.createdAt).toLocaleString()}
          </time>
          <span className="text-xs text-muted-foreground">
            From {report.source === 'conversation' ? 'a conversation' : 'a profile'}
          </span>
        </div>
        <p className="break-words text-sm">
          <strong>{report.reporterDisplayName ?? 'Unknown user'}</strong> reported{' '}
          <strong>{report.reportedDisplayName ?? 'Unknown user'}</strong>
        </p>
        <p className="whitespace-pre-wrap break-words text-sm">{report.description}</p>
        <p className="break-all text-xs text-muted-foreground">Report ID: {report.id}</p>
        {report.resolvedAt && (
          <p className="text-xs text-muted-foreground">
            Resolved {new Date(report.resolvedAt).toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {reported && (
          <div className="space-y-1">
            <p className="font-medium">Reported user</p>
            <RestrictionBadge user={reported} />
            <p className="text-muted-foreground">
              {reported.counts.received} received · {reported.counts.sent} sent
            </p>
          </div>
        )}
        {reporter && (
          <div className="space-y-1">
            <p className="font-medium">Reporter</p>
            <RestrictionBadge user={reporter} />
            <p className="text-muted-foreground">
              {reporter.counts.received} received · {reporter.counts.sent} sent
            </p>
          </div>
        )}
      </div>
      <ReportDecisionForm key={`${report.id}:${report.revision}`} detail={query.data} />
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Report decisions</h3>
        <ModerationHistory actions={actions} />
      </section>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {reported ? (
          <UserReportHistory
            userId={reported.id}
            title="Reported user history"
            fallbackName={report.reportedDisplayName ?? undefined}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Reported account identity unavailable.</p>
        )}
        {reporter ? (
          <UserReportHistory
            userId={reporter.id}
            title="Reporter history"
            fallbackName={report.reporterDisplayName ?? undefined}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Reporter account identity unavailable.</p>
        )}
      </div>
    </div>
  );
}
