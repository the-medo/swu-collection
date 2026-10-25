import { ActivityRow } from './ActivityRow.tsx';
import { Link } from '@tanstack/react-router';
import { useReports, useResolveReport } from '@/api/crossfire/useReports.ts';
import { Button } from '@/components/ui/button.tsx';
export function ProblemReports({
  sessionId,
  embedded = false,
}: {
  sessionId: string;
  embedded?: boolean;
}) {
  const reports = useReports(sessionId),
    resolve = useResolveReport(sessionId);
  return (
    <section
      className={embedded ? 'cf-activity-panel space-y-4' : 'rounded-xl border p-5 space-y-4'}
      aria-label="Your problem reports"
    >
      <h2 className={embedded ? 'sr-only' : 'text-xl font-semibold'}>Your problem reports</h2>
      {reports.isPending ? (
        <p>Loading reports…</p>
      ) : reports.error ? (
        <p role="alert">Could not load your reports.</p>
      ) : !reports.data?.length ? (
        <p className="text-muted-foreground">
          Use “Report a problem” on the game or replay board to save an exact position and describe
          an issue.
        </p>
      ) : (
        reports.data.map(report => (
          <ActivityRow
            key={report.id}
            leaders={report.leaders}
            bases={report.bases}
            className="cf-report-row"
          >
            <div className="grid w-full gap-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <strong className="min-w-0 wrap-anywhere">{report.label || 'Game problem'}</strong>
                <small className="shrink-0">
                  {report.status === 'resolved' ? 'Resolved' : 'Open'}
                </small>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{report.description}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/crossfire/reports/$reportId" params={{ reportId: report.id }}>
                  Open report
                </Link>
                {report.available && (
                  <Link
                    to="/crossfire/replay/$lobbyId"
                    params={{ lobbyId: report.lobbyId }}
                    search={{ cfPosition: report.position, cfBranch: report.branch }}
                  >
                    Open reported position
                  </Link>
                )}
                {report.status === 'open' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate(report.id)}
                  >
                    Mark resolved
                  </Button>
                )}
              </div>
            </div>
          </ActivityRow>
        ))
      )}
      {resolve.error && <p role="alert">Could not update the report.</p>}
    </section>
  );
}
